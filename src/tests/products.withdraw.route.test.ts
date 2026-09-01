import { NextResponse, type NextRequest } from "next/server";

import { POST } from "@/app/api/products/withdraw/route";
import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { ROLE } from "@/types/Roles";
import {
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AuthorizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException } from "@/utils/exceptions/RepoException";

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
  name: "Tomato Basket",
  quantity: 5,
};

const withdrawnProduct = {
  id: "prod-1",
  name: "Tomato Basket",
  quantity: 10,
  price: 2.5,
  category: "VEGTABLE",
  expiry_date: "2099-01-01T00:00:00.000Z",
  low_stock_threshold: 10,
  supplier_id: "sup-1",
  suppliername: "Fresh Farms",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedProductService.withdrawProduct.mockResolvedValue(withdrawnProduct as never);
});

describe("POST /api/products/withdraw", () => {
  describe("successful withdrawal", () => {
    it("returns 200 with the withdrawn product", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("withdraw product");
      expect(json.data).toEqual(withdrawnProduct);
    });

    it("guards the route with the EMPLOYEE role", async () => {
      const request = makeRequest(validBody);

      await POST(request);

      expect(mockedGuard).toHaveBeenCalledTimes(1);
      expect(mockedGuard).toHaveBeenCalledWith(request, {
        requireRole: ROLE.EMPLOYEE,
      });
    });

    it("forwards the product name and quantity to the service", async () => {
      await POST(makeRequest(validBody));

      expect(mockedProductService.withdrawProduct).toHaveBeenCalledTimes(1);
      expect(mockedProductService.withdrawProduct).toHaveBeenCalledWith("user-123", {
        productname: "Tomato Basket",
        quantity: 5,
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
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ success: false, message: "Unauthorized" });
    });

    it("never parses the body or withdraws a product when the guard blocks", async () => {
      mockedGuard.mockReturnValue(
        NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      );
      const request = makeRequest(validBody);

      await POST(request);

      expect(jsonSpy(request)).not.toHaveBeenCalled();
      expect(mockedProductService.withdrawProduct).not.toHaveBeenCalled();
    });
  });

  describe("request validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mockedProductService.withdrawProduct).not.toHaveBeenCalled();
    });

    it.each([
      ["missing name", { quantity: 5 }],
      ["empty name", { name: "   ", quantity: 5 }],
      ["quantity is zero", { name: "Tomato Basket", quantity: 0 }],
      ["non-integer quantity", { name: "Tomato Basket", quantity: 2.5 }],
      ["empty body", {}],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid withdraw product credntials");
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.length).toBeGreaterThan(0);
      expect(mockedProductService.withdrawProduct).not.toHaveBeenCalled();
    });
  });

  describe("business rule failures", () => {
    it("returns 400 when the requested quantity exceeds stock", async () => {
      mockedProductService.withdrawProduct.mockRejectedValue(
        new BadRequestException("insufficient stock requested :20 ,available:15")
      );

      const response = await POST(makeRequest({ name: "Tomato Basket", quantity: 20 }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("insufficient stock requested :20 ,available:15");
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
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
    });

    it("returns 403 when the role is valid but lacks the permission", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to withdraw product");
      expect(json.errorType).toBe("InsufficientPermissionsException");
      expect(mockedProductService.withdrawProduct).not.toHaveBeenCalled();
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
      mockedProductService.withdrawProduct.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Database error while processing withdraw");
      expect(json.errorType).toBe("DBException");
    });
  });
});
