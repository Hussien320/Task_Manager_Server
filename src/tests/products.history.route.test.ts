import { type NextRequest } from "next/server";

import { GET } from "@/app/api/products/[id]/history/route";
import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { ROLE } from "@/types/Roles";
import {
  InsufficientPermissionsException,
  InvalidRoleException,
} from "@/utils/exceptions/http/AuthorizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
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

function makeRequest({ userId = "user-123" } = {}): NextRequest {
  const headers = new Headers();
  headers.set("x-user-id", userId);
  headers.set("x-user-role", ROLE.ADMIN);

  return { headers } as unknown as NextRequest;
}

const productHistory = {
  id: "prod-1",
  name: "Tomato Basket",
  category: "VEGTABLE",
  quantity: 12,
  low_stock_threshold: 10,
  supplier_id: "sup-1",
  supplier_name: "Fresh Farms",
  inventoryLogs: [
    {
      transaction_type: "ADDITION",
      quantity_changed: 15,
      unit_price_at_time: 2.5,
      logged_at: "2026-01-01T00:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedProductService.GetproductHistory.mockResolvedValue(productHistory as never);
});

describe("GET /api/products/[id]/history", () => {
  describe("successful history lookup", () => {
    it("returns 200 with the product history", async () => {
      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(productHistory);
    });

    it("guards the route with the ADMIN role", async () => {
      const request = makeRequest();

      await GET(request, { params: Promise.resolve({ id: "prod-1" }) });

      expect(mockedGuard).toHaveBeenCalledTimes(1);
      expect(mockedGuard).toHaveBeenCalledWith(request, {
        requireRole: ROLE.ADMIN,
      });
    });

    it("awaits the params promise and fetches the correct product history", async () => {
      await GET(makeRequest(), { params: Promise.resolve({ id: "prod-42" }) });

      expect(mockedProductService.GetproductHistory).toHaveBeenCalledTimes(1);
      expect(mockedProductService.GetproductHistory).toHaveBeenCalledWith("prod-42");
    });
  });

  describe("guard returns a response (no authenticated user)", () => {
    it("returns the guard's own response untouched", async () => {
      const denied = new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
      mockedGuard.mockReturnValue(denied as any);

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ success: false, message: "Unauthorized" });
    });

    it("never reads the history when the guard blocks the request", async () => {
      mockedGuard.mockReturnValue(
        new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }) as any
      );

      await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });

      expect(mockedProductService.GetproductHistory).not.toHaveBeenCalled();
    });
  });

  describe("authorization failures thrown by the guard", () => {
    it("returns 403 for an unrecognised role", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InvalidRoleException("Invalid role: wizard");
      });

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("Invalid user role");
      expect(json.errorType).toBe("InvalidRoleException");
      expect(mockedProductService.GetproductHistory).not.toHaveBeenCalled();
    });

    it("returns 403 when the role is valid but lacks the required permission", async () => {
      mockedGuard.mockImplementation(() => {
        throw new InsufficientPermissionsException();
      });

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toBe("You do not have permission to view history");
      expect(json.errorType).toBe("InsufficientPermissionsException");
    });

    it("returns 401 when authentication itself failed", async () => {
      mockedGuard.mockImplementation(() => {
        throw new AuthenticationException("Token expired");
      });

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.message).toBe("Authentication failed. Please login again.");
      expect(json.errorType).toBe("AuthenticationException");
    });
  });

  describe("server errors", () => {
    it("returns 404 when no history exists for the product", async () => {
      mockedProductService.GetproductHistory.mockRejectedValue(
        new ItemNotFoundException("no history found")
      );

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-404" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Product Not found");
      expect(json.errorType).toBe("ItemNotFoundException");
    });

    it("returns 500 on a database failure", async () => {
      mockedProductService.GetproductHistory.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await GET(makeRequest(), { params: Promise.resolve({ id: "prod-1" }) });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Database error while processing GET History");
      expect(json.errorType).toBe("DBException");
    });
  });
});
