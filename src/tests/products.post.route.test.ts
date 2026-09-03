import { NextResponse, type NextRequest } from "next/server";

import { ProductType } from "@/app/generated/prisma/enums";
import { POST } from "@/app/api/products/route";
import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { PERMISSION, ROLE } from "@/types/Roles";
import {
  AuthorizationException,
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AuthorizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/ProductService", () => ({
  productservice: {
    createProduct: jest.fn(),
    getProducts: jest.fn(),
    withdrawProduct: jest.fn(),
    GetproductHistory: jest.fn(),
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
const mockedProductService = productservice as jest.Mocked<typeof productservice>;

function makeRequest(body: unknown, { invalidJson = false, userId = "user-123" } = {}): NextRequest {
  const headers = new Headers();
  headers.set("x-user-id", userId);
  headers.set("x-user-role", ROLE.EMPLOYEE);

  return {
    headers,
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function jsonSpy(request: NextRequest): jest.Mock {
  return (request as unknown as { json: jest.Mock }).json;
}

const validBody = {
  supplier_name: "Fresh Farms",
  name: "Tomato Basket",
  category: ProductType.VEGTABLE,
  quantity: 15,
  price: 2.5,
  expiry_date: "2099-01-01",
};

const createdProduct = {
  id: "prod-1",
  name: "Tomato Basket",
  quantity: 15,
  price: 2.5,
  category: ProductType.VEGTABLE,
  expiry_date: "2099-01-01T00:00:00.000Z",
  low_stock_threshold: 10,
  supplier_id: "sup-1",
  suppliername: "Fresh Farms",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedProductService.createProduct.mockResolvedValue(createdProduct as never);
});

describe("POST /api/products", () => {
  describe("successful creation", () => {
    it("returns 201 with the created product", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toBe("created product");
      expect(json.data).toEqual(createdProduct);
    });

    it("guards the route with the EMPLOYEE role", async () => {
      const request = makeRequest(validBody);

      await POST(request);

      expect(mockedGuard).toHaveBeenCalledTimes(1);
      expect(mockedGuard).toHaveBeenCalledWith(request, {
        requireRole: ROLE.EMPLOYEE,
      });
    });

    it("forwards the validated payload to the product service", async () => {
      await POST(makeRequest(validBody));

      expect(mockedProductService.createProduct).toHaveBeenCalledTimes(1);
      expect(mockedProductService.createProduct).toHaveBeenCalledWith(
        "user-123",
        {
          supplier_name: "Fresh Farms",
          name: "Tomato Basket",
          category: ProductType.VEGTABLE,
          quantity: 15,
          price: 2.5,
          expiry_date: new Date("2099-01-01T00:00:00.000Z"),
        }
      );
    });

    it("drops unknown client fields before calling the service", async () => {
      await POST(
        makeRequest({
          ...validBody,
          id: "attacker-id",
          is_admin: true,
        })
      );

      const [, payload] = mockedProductService.createProduct.mock.calls[0];
      expect(Object.keys(payload).sort()).toEqual([
        "category",
        "expiry_date",
        "name",
        "price",
        "quantity",
        "supplier_name",
      ]);
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
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ success: false, message: "Unauthorized" });
    });

    it("never parses the body or creates a product when the guard blocks", async () => {
      mockedGuard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );
      const request = makeRequest(validBody);

      await POST(request);

      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mockedProductService.createProduct).not.toHaveBeenCalled();
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mockedProductService.createProduct).not.toHaveBeenCalled();
    });

    it.each([
      ["missing supplier_name", { name: "Tomato Basket", category: ProductType.VEGTABLE, quantity: 15, price: 2.5 }],
      ["empty supplier_name", { supplier_name: "", name: "Tomato Basket", category: ProductType.VEGTABLE, quantity: 15, price: 2.5 }],
      ["missing name", { supplier_name: "Fresh Farms", category: ProductType.VEGTABLE, quantity: 15, price: 2.5 }],
      ["quantity is zero", { supplier_name: "Fresh Farms", name: "Tomato Basket", category: ProductType.VEGTABLE, quantity: 0, price: 2.5, expiry_date: "2099-01-01" }],
      ["non-numeric price", { supplier_name: "Fresh Farms", name: "Tomato Basket", category: ProductType.VEGTABLE, quantity: 15, price: "free", expiry_date: "2099-01-01" }],
      ["unknown category", { supplier_name: "Fresh Farms", name: "Tomato Basket", category: "FRUIT", quantity: 15, price: 2.5, expiry_date: "2099-01-01" }],
      ["empty body", {}],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid create product credntials");
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.length).toBeGreaterThan(0);
      expect(mockedProductService.createProduct).not.toHaveBeenCalled();
    });

    it("names the offending field in the validation errors", async () => {
      const response = await POST(
        makeRequest({
          supplier_name: "Fresh Farms",
          name: "Tomato Basket",
          category: "FRUIT",
          quantity: 15,
          price: 2.5,
          expiry_date: "2099-01-01",
        })
      );
      const json = await response.json();

      expect(json.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["category"] })])
      );
    });
  });

  describe("business rule failures", () => {
    it("returns 404 when the supplier for the product does not exist", async () => {
      mockedProductService.createProduct.mockRejectedValue(
        new ItemNotFoundException("supplier not found")
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Supplier not found");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("returns 400 when the service rejects a bad request", async () => {
      mockedProductService.createProduct.mockRejectedValue(
        new BadRequestException("expiray date is required fro perishable products")
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("expiray date is required fro perishable products");
      expect(json.errorType).toBe("BadRequestException");
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
      expect(json.success).toBe(false);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mockedProductService.createProduct).not.toHaveBeenCalled();
    });

    it("returns 403 when the role is valid but lacks the required permission", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to add product");
      expect(json.errorType).toBe("InsufficientPermissionsException");
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
    it("returns 500 on a database failure", async () => {
      mockedProductService.createProduct.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Database error while processing addition");
      expect(json.errorType).toBe("DBException");
    });
  });
});
