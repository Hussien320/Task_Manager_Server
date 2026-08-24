// src/tests/suppliers.post.route.test.ts
import { NextResponse, type NextRequest } from "next/server";

import { ProductType } from "@/app/generated/prisma/enums";
import { POST } from "@/app/api/suppliers/route";
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
import { DBException, ItemExists } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/SupplierService", () => ({
  supplierService: {
    createSupplier: jest.fn(),
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
/** Minimal NextRequest stand-in: the route only ever calls `req.json()`. */
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

const validBody = {
  name: "Fresh Farms",
  product_type: ProductType.VEGTABLE,
};

const createdSupplier = {
  id: "sup-1",
  name: "Fresh Farms",
  product_type: ProductType.VEGTABLE,
  is_active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedSupplierService.createSupplier.mockResolvedValue(createdSupplier as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/suppliers", () => {
  describe("successful creation", () => {
    it("returns 201 with the created supplier", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toBe("created supplier");
      expect(json.data).toEqual(createdSupplier);
    });

    it("guards the route with the CREATE_SUPPLIER permission", async () => {
      const request = makeRequest(validBody);

      await POST(request);

      expect(mockedGuard).toHaveBeenCalledTimes(1);
      expect(mockedGuard).toHaveBeenCalledWith(request, {
        requirePermission: PERMISSION.CREATE_SUPPLIER,
      });
    });

    it("forwards exactly the validated name and product type to the service", async () => {
      await POST(makeRequest(validBody));

      expect(mockedSupplierService.createSupplier).toHaveBeenCalledTimes(1);
      expect(mockedSupplierService.createSupplier).toHaveBeenCalledWith({
        name: "Fresh Farms",
        product_type: ProductType.VEGTABLE,
      });
    });

    /**
     * Zod strips unknown keys, so a client cannot smuggle extra columns
     * (`id`, `is_active`, …) into the create call. Without this test a future
     * switch to `.passthrough()` would silently open that hole.
     */
    it("drops client-supplied fields that are not in the schema", async () => {
      await POST(
        makeRequest({
          ...validBody,
          id: "attacker-chosen-id",
          is_active: false,
          created_at: "2020-01-01",
        })
      );

      const [payload] = mockedSupplierService.createSupplier.mock.calls[0];
      expect(Object.keys(payload).sort()).toEqual(["name", "product_type"]);
    });

    it("trims surrounding whitespace off the supplier name", async () => {
      await POST(makeRequest({ name: "   Fresh Farms   ", product_type: ProductType.PLASTIC }));

      expect(mockedSupplierService.createSupplier).toHaveBeenCalledWith({
        name: "Fresh Farms",
        product_type: ProductType.PLASTIC,
      });
    });

    it.each(Object.values(ProductType))("accepts the %s product type", async (product_type) => {
      const response = await POST(makeRequest({ name: "Fresh Farms", product_type }));

      expect(response.status).toBe(201);
      expect(mockedSupplierService.createSupplier).toHaveBeenCalledWith({
        name: "Fresh Farms",
        product_type,
      });
    });
  });

  describe("guard returns a response (no authenticated user)", () => {
    it("returns the guard's own response untouched", async () => {
      const denied = NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
      mockedGuard.mockReturnValue(denied);

      const response = await POST(makeRequest(validBody));

      expect(response).toBe(denied);
      expect(response.status).toBe(401);
    });

    /**
     * The guard runs *before* `req.json()` (suppliers/route.ts, POST). An unauthorized
     * caller's body is never even parsed — no wasted work, no parsing of hostile input.
     */
    it("never parses the body or creates a supplier when the guard blocks", async () => {
      mockedGuard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );
      const request = makeRequest(validBody);

      await POST(request);

      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mockedSupplierService.createSupplier).not.toHaveBeenCalled();
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mockedSupplierService.createSupplier).not.toHaveBeenCalled();
    });

    it.each([
      ["missing name", { product_type: ProductType.VEGTABLE }],
      ["empty name", { name: "", product_type: ProductType.VEGTABLE }],
      ["whitespace-only name", { name: "     ", product_type: ProductType.VEGTABLE }],
      ["name shorter than 2 chars", { name: "A", product_type: ProductType.VEGTABLE }],
      ["name longer than 100 chars", { name: "x".repeat(101), product_type: ProductType.VEGTABLE }],
      ["missing product_type", { name: "Fresh Farms" }],
      ["unknown product_type", { name: "Fresh Farms", product_type: "FURNITURE" }],
      ["lowercase product_type", { name: "Fresh Farms", product_type: "vegtable" }],
      ["empty body", {}],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid create supplier credntials");
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.length).toBeGreaterThan(0);
      expect(mockedSupplierService.createSupplier).not.toHaveBeenCalled();
    });

    it("names the offending field in the validation errors", async () => {
      const response = await POST(
        makeRequest({ name: "Fresh Farms", product_type: "FURNITURE" })
      );
      const json = await response.json();

      expect(json.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["product_type"] })])
      );
    });

    it("reports every invalid field at once, not just the first", async () => {
      const response = await POST(makeRequest({ name: "A", product_type: "FURNITURE" }));
      const json = await response.json();

      const paths = json.errors.map((e: { path: string[] }) => e.path[0]);
      expect(paths).toContain("name");
      expect(paths).toContain("product_type");
    });
  });

  describe("business rule failures", () => {
    it("returns 400 when the supplier already exists", async () => {
      mockedSupplierService.createSupplier.mockRejectedValue(new ItemExists());

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("supplier already created");
      expect(json.errorType).toBe("ItemExists");
    });

    /** Guards against the `meessage` typo this branch used to ship. */
    it("puts the duplicate message on the standard `message` key", async () => {
      mockedSupplierService.createSupplier.mockRejectedValue(new ItemExists());

      const json = await (await POST(makeRequest(validBody))).json();

      expect(json).toHaveProperty("message");
      expect(json).not.toHaveProperty("meessage");
    });

    it("returns 400 when the service rejects the request as bad", async () => {
      mockedSupplierService.createSupplier.mockRejectedValue(
        new BadRequestException("Bad request: product type not stocked")
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("product type not stocked");
    });
  });

  describe("authorization failures thrown by the guard", () => {
    it("returns 403 for an unrecognised role", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mockedSupplierService.createSupplier).not.toHaveBeenCalled();
    });

    it("returns 403 when an employee tries to create a supplier", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to add suppliers");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mockedSupplierService.createSupplier).not.toHaveBeenCalled();
    });

    it("returns 403 with the original message for a generic authorization failure", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthorizationException("Access denied. admin role required.");
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Access denied. admin role required.");
      expect(json.errorType).toBe("AuthorizationException");
    });

    it("falls back to a default message when the authorization error has none", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthorizationException("");
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Authorization failed");
    });

    it("returns 401 when authentication itself failed", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthenticationException("Token expired");
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.message).toBe("Authentication failed. Please login again.");
      expect(json.errorType).toBe("AuthenticationException");
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure without leaking the driver message", async () => {
      mockedSupplierService.createSupplier.mockRejectedValue(
        new DBException("Insert failed", new Error("unique constraint violated"))
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing addition");
      expect(JSON.stringify(json)).not.toContain("unique constraint violated");
    });

    it("returns 500 on an unexpected error", async () => {
      mockedSupplierService.createSupplier.mockRejectedValue(new Error("boom"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(JSON.stringify(json)).not.toContain("boom");
    });
  });
});
