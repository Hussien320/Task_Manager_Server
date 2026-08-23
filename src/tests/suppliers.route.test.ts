// src/tests/suppliers.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { GET } from "@/app/api/suppliers/route";
import { authGuard } from "@/lib/auth/guard";
import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";
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
    Get_All_Suppliers: jest.fn(),
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

const supplier_a = {
  id: "sup-1",
  name: "Fresh Farms",
  product_type: "VEGTABLE",
  is_active: true,
};

const supplier_b = {
  id: "sup-2",
  name: "PlastiCo",
  product_type: "PLASTIC",
  is_active: false,
};

const supplier_list = { suppliers: [supplier_a, supplier_b], total: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  // Happy path by default: the guard lets the request through and the service returns a list.
  mocked_guard.mockReturnValue(null);
  mocked_supplier_service.Get_All_Suppliers.mockResolvedValue(supplier_list as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("GET /api/suppliers", () => {
  describe("successful listing", () => {
    it("returns 200 with the supplier list and a total in meta", async () => {
      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(supplier_list);
      expect(json.meta).toEqual({ total: 2 });
    });

    it("returns an empty list rather than an error when there are no suppliers", async () => {
      mocked_supplier_service.Get_All_Suppliers.mockResolvedValue({
        suppliers: [],
        total: 0,
      } as never);

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.suppliers).toEqual([]);
      expect(json.meta.total).toBe(0);
    });

    it("guards the route with the READ_ALL_SUPPLIERS permission", async () => {
      const request = makeRequest();

      await GET(request);

      expect(mocked_guard).toHaveBeenCalledTimes(1);
      expect(mocked_guard).toHaveBeenCalledWith(request, {
        requirePermission: PERMISSION.READ_ALL_SUPPLIERS,
      });
    });

    it("checks authorization before touching the service", async () => {
      await GET(makeRequest());

      const guard_order = mocked_guard.mock.invocationCallOrder[0];
      const service_order =
        mocked_supplier_service.Get_All_Suppliers.mock.invocationCallOrder[0];

      expect(guard_order).toBeLessThan(service_order);
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

      // The route does `if (autherror) return autherror` — same object, not a copy.
      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    it("never queries suppliers when the guard blocks the request", async () => {
      mocked_guard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );

      await GET(makeRequest());

      expect(mocked_supplier_service.Get_All_Suppliers).not.toHaveBeenCalled();
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
      expect(json.success).toBe(false);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mocked_supplier_service.Get_All_Suppliers).not.toHaveBeenCalled();
    });

    it("returns 403 when the role is valid but lacks the permission", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to view suppliers");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mocked_supplier_service.Get_All_Suppliers).not.toHaveBeenCalled();
    });

    it("returns 403 with the original message for a generic authorization failure", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. admin role required.");
      });

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. admin role required.");
      expect(json.errorType).toBe("AuthorizationException");
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

    /**
     * `InvalidRoleException` and `InsufficientPermissionsException` both extend
     * `AuthorizationException`, so the route's `instanceof` checks only report the
     * specific error because the specific checks come first. Reordering them would
     * make every 403 collapse into the generic branch — this test catches that.
     */
    it("reports the most specific authorization error, not the base class", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const specific = await (await GET(makeRequest())).json();

      expect(specific.errorType).toBe("InsufficientPermissionsException");
      expect(specific.errorType).not.toBe("AuthorizationException");
    });
  });

  describe("server errors", () => {
    it("returns 404 when the service reports nothing found", async () => {
      mocked_supplier_service.Get_All_Suppliers.mockRejectedValue(
        new ItemNotFoundException("No suppliers exist")
      );

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("No suppliers exist");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("falls back to a default message when the not-found error has none", async () => {
      mocked_supplier_service.Get_All_Suppliers.mockRejectedValue(
        new ItemNotFoundException("")
      );

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("Resource not found");
    });

    it("returns 500 on a database failure without leaking the driver message", async () => {
      mocked_supplier_service.Get_All_Suppliers.mockRejectedValue(
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
      mocked_supplier_service.Get_All_Suppliers.mockRejectedValue(new Error("boom"));

      const response = await GET(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(json.errorType).toBe("UnknownError");
      expect(JSON.stringify(json)).not.toContain("boom");
    });
  });
});
