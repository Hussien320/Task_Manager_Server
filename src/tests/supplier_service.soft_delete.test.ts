// src/tests/supplier_service.soft_delete.test.ts
//
// Service-level test (not a route test): the collaborator being faked is the
// repository, and there is no request/response involved.
import { suplier_repo } from "@/repository/supplier_repo";
import { supplier_service } from "@/services/supplier_service";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/repository/supplier_repo", () => ({
  suplier_repo: {
    Get_Supplier_By_Id: jest.fn(),
    softDelete: jest.fn(),
  },
}));

jest.mock("@/utils/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mocked_repo = suplier_repo as jest.Mocked<typeof suplier_repo>;

// ── Fixtures ─────────────────────────────────────────────────────────────────
const SUPPLIER_ID = "sup-1";

const active_supplier = {
  id: SUPPLIER_ID,
  name: "Fresh Farms",
  product_type: "VEGTABLE",
  is_active: true,
};

const inactive_supplier = { ...active_supplier, is_active: false };

beforeEach(() => {
  jest.clearAllMocks();
  mocked_repo.Get_Supplier_By_Id.mockResolvedValue(active_supplier as never);
  mocked_repo.softDelete.mockResolvedValue(undefined as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("supplier_service.Soft_Delete", () => {
  describe("happy path", () => {
    it("deactivates a supplier that is currently active", async () => {
      await expect(supplier_service.Soft_Delete(SUPPLIER_ID)).resolves.toBeUndefined();

      expect(mocked_repo.softDelete).toHaveBeenCalledTimes(1);
      expect(mocked_repo.softDelete).toHaveBeenCalledWith(SUPPLIER_ID);
    });

    it("looks the supplier up before writing to it", async () => {
      await supplier_service.Soft_Delete(SUPPLIER_ID);

      expect(mocked_repo.Get_Supplier_By_Id).toHaveBeenCalledWith(SUPPLIER_ID);
      expect(mocked_repo.Get_Supplier_By_Id.mock.invocationCallOrder[0]).toBeLessThan(
        mocked_repo.softDelete.mock.invocationCallOrder[0]
      );
    });
  });

  describe("business rules", () => {
    it("throws ItemNotFoundException when the supplier does not exist", async () => {
      mocked_repo.Get_Supplier_By_Id.mockResolvedValue(null as never);

      await expect(supplier_service.Soft_Delete("ghost-id")).rejects.toThrow(
        ItemNotFoundException
      );
      expect(mocked_repo.softDelete).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when the supplier is already deactivated", async () => {
      mocked_repo.Get_Supplier_By_Id.mockResolvedValue(inactive_supplier as never);

      await expect(supplier_service.Soft_Delete(SUPPLIER_ID)).rejects.toThrow(
        new BadRequestException("Supplier already deactivated")
      );
      expect(mocked_repo.softDelete).not.toHaveBeenCalled();
    });
  });

  /**
   * Regression tests. `Soft_Delete` used to wrap its body in a `try/catch` that
   * re-threw only `BadRequestException` and swallowed everything else — so a failed
   * database write **resolved normally** and the route replied 204 as if the
   * supplier had been deactivated. These two tests fail if that catch comes back.
   */
  describe("infrastructure failures must propagate", () => {
    it("propagates a DBException raised while looking the supplier up", async () => {
      mocked_repo.Get_Supplier_By_Id.mockRejectedValue(
        new DBException("Error retrieving supplier", new Error("connection refused"))
      );

      await expect(supplier_service.Soft_Delete(SUPPLIER_ID)).rejects.toThrow(DBException);
      expect(mocked_repo.softDelete).not.toHaveBeenCalled();
    });

    it("propagates a DBException raised by the write itself", async () => {
      mocked_repo.softDelete.mockRejectedValue(
        new DBException("erroe while updating the supplier", new Error("deadlock detected"))
      );

      await expect(supplier_service.Soft_Delete(SUPPLIER_ID)).rejects.toThrow(DBException);
    });

    it("propagates an unexpected non-HTTP error instead of resolving", async () => {
      mocked_repo.softDelete.mockRejectedValue(new Error("boom"));

      await expect(supplier_service.Soft_Delete(SUPPLIER_ID)).rejects.toThrow("boom");
    });
  });
});
