// src/tests/suppliers_active.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { GET } from "@/app/api/suppliers/active_suppliers/route";
import { authGuard } from "@/lib/auth/guard";
import { supplier_service } from "@/services/supplier_service";
import { ROLE } from "@/types/roles";
import {
  AuthorizationException,
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/supplier_service", () => ({
  supplier_service: {
    Get_Active_Suppliers: jest.fn(),
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
/** The route never reads the request — `authGuard` is mocked, so an empty object suffices. */
function makeRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

const active_supplier = {
  id: "sup-1",
  name: "Fresh Farms",
  product_type: "VEGTABLE",
  is_active: true,
};

const active_list = { suppliers: [active_supplier], total: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  mocked_guard.mockReturnValue(null);
  mocked_supplier_service.Get_Active_Suppliers.mockResolvedValue(active_list as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("GET /api/suppliers/active_suppliers", () => {
  describe("successful listing", () => {
    it("returns 200 with the active suppliers and a total in meta", async () => {
      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(active_list);
      expect(json.meta).toEqual({ total: 1 });
    });

    it("returns an empty list when no supplier is active", async () => {
      mocked_supplier_service.Get_Active_Suppliers.mockResolvedValue({
        suppliers: [],
        total: 0,
      } as never);

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.suppliers).toEqual([]);
      expect(json.meta.total).toBe(0);
    });

    /**
     * This route gates on a *role*, not a permission — unlike every other supplier
     * route. If someone "tidies" it into `requirePermission`, admins would silently
     * gain access to an employee-only endpoint. Pinning the option here catches that.
     */
    it("guards the route by requiring the EMPLOYEE role", async () => {
      const request = makeRequest();

      await GET(request);

      expect(mocked_guard).toHaveBeenCalledTimes(1);
      expect(mocked_guard).toHaveBeenCalledWith(request, { requireRole: ROLE.EMPLOYEE });
    });

    it("calls the active-only service, never the fetch-everything one", async () => {
      await GET(makeRequest());

      expect(mocked_supplier_service.Get_Active_Suppliers).toHaveBeenCalledTimes(1);
      expect(mocked_supplier_service.Get_Active_Suppliers).toHaveBeenCalledWith();
    });

    it("checks authorization before touching the service", async () => {
      await GET(makeRequest());

      expect(mocked_guard.mock.invocationCallOrder[0]).toBeLessThan(
        mocked_supplier_service.Get_Active_Suppliers.mock.invocationCallOrder[0]
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

      const response = await GET(makeRequest());

      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    it("never queries suppliers when the guard blocks the request", async () => {
      mocked_guard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );

      await GET(makeRequest());

      expect(mocked_supplier_service.Get_Active_Suppliers).not.toHaveBeenCalled();
    });
  });

  describe("authorization failures thrown by the guard", () => {
    it("returns 403 for an unrecognised role", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mocked_supplier_service.Get_Active_Suppliers).not.toHaveBeenCalled();
    });

    it("returns 403 when an admin hits this employee-only route", async () => {
      // This is what the real guard throws on a `requireRole` mismatch.
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. employee role required.");
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. employee role required.");
      expect(json.errorType).toBe("AuthorizationException");
      expect(mocked_supplier_service.Get_Active_Suppliers).not.toHaveBeenCalled();
    });

    it("returns 403 when the role lacks the permission", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to view suppliers");
      expect(json.errorType).toBe("InsufficientPermissionsException");
    });

    it("falls back to a default message when the authorization error has none", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("");
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Authorization failed");
    });

    it("returns 401 when authentication itself failed", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthenticationException("Token expired");
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.message).toBe("Authentication failed. Please login again.");
      expect(json.errorType).toBe("AuthenticationException");
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure without leaking the driver message", async () => {
      mocked_supplier_service.Get_Active_Suppliers.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while fetching suppliers");
      expect(json.errorType).toBe("DBException");
      expect(JSON.stringify(json)).not.toContain("connection refused");
    });

    it("returns 500 on an unexpected error", async () => {
      mocked_supplier_service.Get_Active_Suppliers.mockRejectedValue(new Error("boom"));

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(json.errorType).toBe("UnknownError");
    });

    it("returns 404 when the service reports nothing found", async () => {
      mocked_supplier_service.Get_Active_Suppliers.mockRejectedValue(
        new ItemNotFoundException("No active suppliers")
      );

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("No active suppliers");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("falls back to a default message when the not-found error has none", async () => {
      mocked_supplier_service.Get_Active_Suppliers.mockRejectedValue(
        new ItemNotFoundException("")
      );

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("Resource not found");
    });
  });
});
