// src/tests/suppliers.id.patch.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { ProductType } from "@/app/generated/prisma/enums";
import { PATCH } from "@/app/api/suppliers/[id]/route";
import { authGuard } from "@/lib/auth/guard";
import { supplierService } from "@/services/SupplierService";
import { PERMISSION } from "@/types/Roles";
import {
  AuthorizationException,
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AuthorizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemExists, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/SupplierService", () => ({
  supplierService: {
    updateSupplier: jest.fn(),
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

const mockedGuard = authGuard as jest.MockedFunction<typeof authGuard>;
const mockedSupplierService = supplierService as jest.Mocked<typeof supplierService>;

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

const updatedSupplier = {
  id: SUPPLIER_ID,
  name: "Fresher Farms",
  product_type: ProductType.PLASTIC,
  is_active: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedSupplierService.updateSupplier.mockResolvedValue(updatedSupplier as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("PATCH /api/suppliers/[id]", () => {
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
      expect(json.data).toEqual(updatedSupplier);
    });

    it("forwards a name-only patch without inventing the other fields", async () => {
      await PATCH(makeRequest({ name: "Fresher Farms" }), makeContext(SUPPLIER_ID));

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledTimes(1);
      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(SUPPLIER_ID, {
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

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: undefined,
        product_type: ProductType.CLEANING,
        is_active: undefined,
      });
    });

    it("forwards an activity-only patch, including `false`", async () => {
      await PATCH(makeRequest({ is_active: false }), makeContext(SUPPLIER_ID));

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(SUPPLIER_ID, {
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

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(SUPPLIER_ID, {
        name: "Fresher Farms",
        product_type: ProductType.PLASTIC,
        is_active: true,
      });
    });

    it("trims the incoming name", async () => {
      await PATCH(makeRequest({ name: "   Fresher Farms   " }), makeContext(SUPPLIER_ID));

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(
        SUPPLIER_ID,
        expect.objectContaining({ name: "Fresher Farms" })
      );
    });

    it("awaits the params promise instead of passing it through raw", async () => {
      await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));

      const [passedId] = mockedSupplierService.updateSupplier.mock.calls[0];
      expect(passedId).toBe(OTHER_ID);
      expect(passedId).not.toBeInstanceOf(Promise);
    });

    it("ignores unknown fields in the body", async () => {
      await PATCH(
        makeRequest({ name: "Fresher Farms", is_admin: true }),
        makeContext(SUPPLIER_ID)
      );

      expect(mockedSupplierService.updateSupplier).toHaveBeenCalledWith(
        SUPPLIER_ID,
        expect.not.objectContaining({ is_admin: expect.anything() })
      );
    });

    it("guards the route with the UPDATE_SUPPLIER permission", async () => {
      const request = makeRequest({ is_active: true });

      await PATCH(request, makeContext(SUPPLIER_ID));

      expect(mockedGuard).toHaveBeenCalledTimes(1);
      expect(mockedGuard).toHaveBeenCalledWith(request, {
        requirePermission: PERMISSION.UPDATE_SUPPLIER,
      });
    });

    it("checks authorization before touching anything", async () => {
      await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));

      expect(mockedGuard.mock.invocationCallOrder[0]).toBeLessThan(
        mockedSupplierService.updateSupplier.mock.invocationCallOrder[0]
      );
    });
  });

  describe("guard returns a response (no authenticated user)", () => {
    it("returns the guard's own response untouched", async () => {
      const denied = NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
      mockedGuard.mockReturnValue(denied);

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));

      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    it("never reads the body when the guard blocks the request", async () => {
      mockedGuard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );
      const request = makeRequest({ is_active: true });

      await PATCH(request, makeContext(SUPPLIER_ID));

      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
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
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty id", async () => {
      const response = await PATCH(makeRequest({ is_active: true }), makeContext("   "));

      expect(response.status).toBe(400);
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
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
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 400 when no editable field is provided", async () => {
      const response = await PATCH(makeRequest({}), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(JSON.stringify(json.errors)).toContain("At least one of name");
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 400 for a name shorter than 2 characters", async () => {
      const response = await PATCH(makeRequest({ name: "A" }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(JSON.stringify(json.errors)).toContain("at least 2 characters");
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
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
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 400 when is_active is not a boolean", async () => {
      const response = await PATCH(
        makeRequest({ is_active: "yes" }),
        makeContext(SUPPLIER_ID)
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 400 when the body is not an object", async () => {
      const response = await PATCH(makeRequest("Fresher Farms"), makeContext(SUPPLIER_ID));

      expect(response.status).toBe(400);
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });
  });

  describe("business rule failures", () => {
    it("returns 404 when the supplier does not exist", async () => {
      mockedSupplierService.updateSupplier.mockRejectedValue(
        new ItemNotFoundException("supplier not found")
      );

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Supplier not found");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("falls back to a default message when the not-found error has none", async () => {
      mockedSupplierService.updateSupplier.mockRejectedValue(new ItemNotFoundException(""));

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(OTHER_ID));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toBe("Supplier not found");
    });

  

    it("returns 400 when the patch would change nothing", async () => {
      mockedSupplierService.updateSupplier.mockRejectedValue(
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
      mockedGuard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 403 when an employee tries to update a supplier", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to update suppliers");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mockedSupplierService.updateSupplier).not.toHaveBeenCalled();
    });

    it("returns 403 with the original message for a generic authorization failure", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. admin role required.");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. admin role required.");
      expect(json.errorType).toBe("AuthorizationException");
    });

    it("falls back to a default message when the authorization error has none", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthorizationException("");
      });

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Authorization failed");
    });

    it("returns 401 when authentication itself failed", async () => {
      mockedGuard.mockImplementation(() => {
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
      mockedSupplierService.updateSupplier.mockRejectedValue(
        new DBException("error while updating the supplier", new Error("deadlock detected"))
      );

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing update");
      expect(JSON.stringify(json)).not.toContain("deadlock detected");
    });

    it("returns 500 on an unexpected error", async () => {
      mockedSupplierService.updateSupplier.mockRejectedValue(new Error("boom"));

      const response = await PATCH(makeRequest({ is_active: true }), makeContext(SUPPLIER_ID));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(JSON.stringify(json)).not.toContain("boom");
    });
  });
});
