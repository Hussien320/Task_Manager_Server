// src/tests/suppliers_update.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { ProductType } from "@/app/generated/prisma/enums";
import { PATCH } from "@/app/api/suppliers/update/[id]/route";
import { authGuard } from "@/lib/auth/guard";
import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";
import {
  AuthorizationException,
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemExists, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/supplier_service", () => ({
  supplier_service: {
    Update_Supplier: jest.fn(),
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

const mocked_guard = authGuard as jest.MockedFunction<typeof authGuard>;
const mocked_supplier_service = supplier_service as jest.Mocked<typeof supplier_service>;

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Minimal NextRequest stand-in: the route only ever calls `request.json()`. */
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

/** Reads back the `json` spy from a stand-in so tests can assert it was skipped. */
function jsonSpy(request: NextRequest): jest.Mock {
  return (request as unknown as { json: jest.Mock }).json;
}

/** In this Next.js version `params` is a **Promise**, so the test hands over a promise. */
function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// The id must survive `SupplierIdSchema` (uuid), so fixtures use real uuids.
const SUPPLIER_ID = "3f2a9c14-6b1e-4a7d-9d55-8c2f0b7e1a34";
const OTHER_ID = "8b7c6d5e-4f3a-42b1-9c8d-7e6f5a4b3c2d";

const updated_supplier = {
  id: SUPPLIER_ID,
  name: "Fresher Farms",
  product_type: ProductType.PLASTIC,
  is_active: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked_guard.mockReturnValue(null);
  mocked_supplier_service.Update_Supplier.mockResolvedValue(updated_supplier as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("PATCH /api/suppliers/update/[id]", () => {
  describe("successful update", () => {
    it("returns 200 with the updated supplier", async () => {
      const response = await PATCH(
        makeRequest({ name: "Fresher Farms" }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("updated supplier");
      expect(json.data).toEqual(updated_supplier);
    });

    it("forwards a name-only patch without inventing the other fields", async () => {
      await PATCH(makeRequest({ name: "Fresher Farms" }), makeContext(SUPPLIER_ID));

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledTimes(1);
      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: "Fresher Farms",
        product_type: undefined,
        is_active: undefined,
      });
    });

    it("forwards a category-only patch", async () => {
      await PATCH(
        makeRequest({ product_type: ProductType.CLEANING }),
        makeContext(SUPPLIER_ID)
      );

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: undefined,
        product_type: ProductType.CLEANING,
        is_active: undefined,
      });
    });

    it("forwards an activity-only patch, including `false`", async () => {
      await PATCH(makeRequest({ is_active: false }), makeContext(SUPPLIER_ID));

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: undefined,
        product_type: undefined,
        is_active: false,
      });
    });

    it("forwards all three fields at once", async () => {
      await PATCH(
        makeRequest({
          name: "Fresher Farms",
          product_type: ProductType.PLASTIC,
          is_active: true,
        }),
        makeContext(SUPPLIER_ID)
      );

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: "Fresher Farms",
        product_type: ProductType.PLASTIC,
        is_active: true,
      });
    });

    it("trims the incoming name", async () => {
      await PATCH(makeRequest({ name: "   Fresher Farms   " }), makeContext(SUPPLIER_ID));

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(
        SUPPLIER_ID,
        expect.objectContaining({ name: "Fresher Farms" })
      );
    });

    it("awaits the params promise instead of passing it through raw", async () => {
      await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));

      const [passed_id] = mocked_supplier_service.Update_Supplier.mock.calls[0];
      expect(passed_id).toBe(OTHER_ID);
      expect(passed_id).not.toBeInstanceOf(Promise);
    });

    it("ignores unknown fields in the body", async () => {
      await PATCH(
        makeRequest({ name: "Fresher Farms", is_admin: true }),
        makeContext(SUPPLIER_ID)
      );

      expect(mocked_supplier_service.Update_Supplier).toHaveBeenCalledWith(
        SUPPLIER_ID,
        expect.not.objectContaining({ is_admin: expect.anything() })
      );
    });

    it("guards the route with the UPDATE_SUPPLIER permission", async () => {
      const request = makeRequest({ is_active: true });

      await PATCH(request, makeContext(SUPPLIER_ID));

      expect(mocked_guard).toHaveBeenCalledTimes(1);
      expect(mocked_guard).toHaveBeenCalledWith(request, {
        requirePermission: PERMISSION.UPDATE_SUPPLIER,
      });
    });

    it("checks authorization before touching anything", async () => {
      await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));

      expect(mocked_guard.mock.invocationCallOrder[0]).toBeLessThan(
        mocked_supplier_service.Update_Supplier.mock.invocationCallOrder[0]
      );
    });
  });

  describe("guard returns a response (no authenticated user)", () => {
    it("returns the guard's own response untouched", async () => {
      const denied = NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
      mocked_guard.mockReturnValue(denied);

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));

      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    it("never reads the body when the guard blocks the request", async () => {
      mocked_guard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );
      const request = makeRequest({ is_active: true });

      await PATCH(request, makeContext(SUPPLIER_ID));

      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });
  });

  describe("request validation", () => {
    it("returns 400 for a non-uuid id and never reads the body", async () => {
      const request = makeRequest({ is_active: true });

      const response = await PATCH(request, makeContext("not-a-uuid"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid supplier id");
      expect(json.errors[0].path).toEqual(["id"]);
      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty id", async () => {
      const response = await PATCH(makeRequest({ is_active: true }), makeContext("   "));

      expect(response.status).toBe(400);
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 when the body is not valid JSON", async () => {
      const response = await PATCH(
        makeRequest(null, { invalidJson: true }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 when no editable field is provided", async () => {
      const response = await PATCH(makeRequest({}), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(JSON.stringify(json.errors)).toContain("At least one of name");
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 for a name shorter than 2 characters", async () => {
      const response = await PATCH(makeRequest({ name: "A" }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(JSON.stringify(json.errors)).toContain("at least 2 characters");
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 for a name longer than 100 characters", async () => {
      const response = await PATCH(
        makeRequest({ name: "x".repeat(101) }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(JSON.stringify(json.errors)).toContain("too long");
    });

    it("returns 400 for a product_type outside the enum", async () => {
      const response = await PATCH(
        makeRequest({ product_type: "FURNITURE" }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 when is_active is not a boolean", async () => {
      const response = await PATCH(
        makeRequest({ is_active: "yes" }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 400 when the body is not an object", async () => {
      const response = await PATCH(makeRequest("Fresher Farms"), makeContext(SUPPLIER_ID));

      expect(response.status).toBe(400);
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });
  });

  describe("business rule failures", () => {
    it("returns 404 when the supplier does not exist", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(
        new ItemNotFoundException("supplier not found")
      );

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("supplier not found");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("falls back to a default message when the not-found error has none", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(new ItemNotFoundException(""));

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("Resource not found");
    });

    it("returns 400 when the new name is taken by another supplier", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(new ItemExists());

      const response = await PATCH(
        makeRequest({ name: "Fresh Farms" }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Another supplier already uses this name");
      expect(json.errorType).toBe("ItemExists");
    });

    it("returns 400 when the patch would change nothing", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(
        new BadRequestException("No changes to apply, the supplier already has these values")
      );

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("No changes to apply");
    });
  });

  describe("authorization failures thrown by the guard", () => {
    it("returns 403 for an unrecognised role", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 403 when an employee tries to update a supplier", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to update suppliers");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mocked_supplier_service.Update_Supplier).not.toHaveBeenCalled();
    });

    it("returns 403 with the original message for a generic authorization failure", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. admin role required.");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. admin role required.");
      expect(json.errorType).toBe("AuthorizationException");
    });

    it("falls back to a default message when the authorization error has none", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Authorization failed");
    });

    it("returns 401 when authentication itself failed", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthenticationException("Token expired");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.message).toBe("Authentication failed. Please login again.");
      expect(json.errorType).toBe("AuthenticationException");
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure without leaking the driver message", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(
        new DBException("error while updating the supplier", new Error("deadlock detected"))
      );

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing update");
      expect(JSON.stringify(json)).not.toContain("deadlock detected");
    });

    it("returns 500 on an unexpected error", async () => {
      mocked_supplier_service.Update_Supplier.mockRejectedValue(new Error("boom"));

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(JSON.stringify(json)).not.toContain("boom");
    });
  });
});
