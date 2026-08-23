// src/tests/suppliers_id.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { PUT } from "@/app/api/suppliers/[id]/route";
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
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/supplier_service", () => ({
  supplier_service: {
    Soft_Delete: jest.fn(),
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

/**
 * The handler's second argument. In this Next.js version `params` is a **Promise**
 * (`[id]/route.ts:11`), so the test has to hand over a promise, not a plain object.
 */
function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SUPPLIER_ID = "sup-1";

beforeEach(() => {
  jest.clearAllMocks();
  mocked_guard.mockReturnValue(null);
  mocked_supplier_service.Soft_Delete.mockResolvedValue(undefined as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("PUT /api/suppliers/[id]", () => {
  describe("successful soft delete", () => {
    it("returns 204 with no body", async () => {
      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));

      expect(response.status).toBe(204);
      // 204 means "no content" — there is nothing to parse, so never call .json() here.
      expect(await response.text()).toBe("");
    });

    it("soft-deletes the supplier named in the route params", async () => {
      await PUT(makeRequest(), makeContext(SUPPLIER_ID));

      expect(mocked_supplier_service.Soft_Delete).toHaveBeenCalledTimes(1);
      expect(mocked_supplier_service.Soft_Delete).toHaveBeenCalledWith(SUPPLIER_ID);
    });

    it("awaits the params promise instead of passing it through raw", async () => {
      await PUT(makeRequest(), makeContext("another-id"));

      const [passed_id] = mocked_supplier_service.Soft_Delete.mock.calls[0];
      expect(passed_id).toBe("another-id");
      expect(passed_id).not.toBeInstanceOf(Promise);
    });

    it("guards the route with the DELETE_SUPPLIER permission", async () => {
      const request = makeRequest();

      await PUT(request, makeContext(SUPPLIER_ID));

      expect(mocked_guard).toHaveBeenCalledTimes(1);
      expect(mocked_guard).toHaveBeenCalledWith(request, {
        requirePermission: PERMISSION.DELETE_SUPPLIER,
      });
    });

    it("checks authorization before deleting anything", async () => {
      await PUT(makeRequest(), makeContext(SUPPLIER_ID));

      expect(mocked_guard.mock.invocationCallOrder[0]).toBeLessThan(
        mocked_supplier_service.Soft_Delete.mock.invocationCallOrder[0]
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

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));

      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    it("deletes nothing when the guard blocks the request", async () => {
      mocked_guard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );

      await PUT(makeRequest(), makeContext(SUPPLIER_ID));

      expect(mocked_supplier_service.Soft_Delete).not.toHaveBeenCalled();
    });
  });

  describe("business rule failures", () => {
    it("returns 404 when the supplier does not exist", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(
        new ItemNotFoundException("supplier not found")
      );

      const response = await PUT(makeRequest(), makeContext("ghost-id"));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("supplier not found");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("returns 400 when the supplier is already deactivated", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(
        new BadRequestException("Supplier already deactivated")
      );

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("already deactivated");
    });

    it("passes any validation details through to the client", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(
        new BadRequestException("Invalid id", {
          errors: [{ path: ["id"], message: "must be a uuid" }],
        })
      );

      const response = await PUT(makeRequest(), makeContext("not-a-uuid"));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errors).toEqual([{ path: ["id"], message: "must be a uuid" }]);
    });
  });

  describe("authorization failures thrown by the guard", () => {
    it("returns 403 for an unrecognised role", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mocked_supplier_service.Soft_Delete).not.toHaveBeenCalled();
    });

    it("returns 403 when an employee tries to delete a supplier", async () => {
      mocked_guard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to delete supplider");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mocked_supplier_service.Soft_Delete).not.toHaveBeenCalled();
    });

    it("returns 403 with the original message for a generic authorization failure", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. admin role required.");
      });

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. admin role required.");
      expect(json.errorType).toBe("AuthorizationException");
    });

    it("falls back to a default message when the authorization error has none", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthorizationException("");
      });

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Authorization failed");
    });

    it("returns 401 when authentication itself failed", async () => {
      mocked_guard.mockImplementation(() => {
        throw new AuthenticationException("Token expired");
      });

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.message).toBe("Authentication failed. Please login again.");
      expect(json.errorType).toBe("AuthenticationException");
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure without leaking the driver message", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(
        new DBException("Update failed", new Error("deadlock detected"))
      );

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing deletion");
      expect(JSON.stringify(json)).not.toContain("deadlock detected");
    });

    it("returns 500 on an unexpected error", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(new Error("boom"));

      const response = await PUT(makeRequest(), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(JSON.stringify(json)).not.toContain("boom");
    });

    it("falls back to a default message when the not-found error has none", async () => {
      mocked_supplier_service.Soft_Delete.mockRejectedValue(new ItemNotFoundException(""));

      const response = await PUT(makeRequest(), makeContext("ghost-id"));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("Resource not found");
    });
  });
});
