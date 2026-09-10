import { NextResponse, type NextRequest } from "next/server";

import { PUT } from "@/app/api/products/[id]/reload/route";
import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { PERMISSION, ROLE } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/ProductService", () => ({
  productservice: {
    reloadProduct: jest.fn(),
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

function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  const headers = new Headers();
  headers.set("x-user-role", ROLE.ADMIN);

  return {
    headers,
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const reloadedProduct = {
  id: "prod-1",
  name: "Tomato Basket",
  quantity: 25,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedProductService.reloadProduct.mockResolvedValue(reloadedProduct as never);
});

describe("PUT /api/products/[id]/reload", () => {
  it("returns 200 with the reloaded product", async () => {
    const response = await PUT(makeRequest({ quantity: 10 }), makeContext("prod-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: "Product reloaded successfully",
      data: reloadedProduct,
    });
  });

  it("guards the route with the RELOAD_PRODUCT permission", async () => {
    const request = makeRequest({ quantity: 10 });

    await PUT(request, makeContext("prod-1"));

    expect(mockedGuard).toHaveBeenCalledWith(request, {
      requirePermission: PERMISSION.RELOAD_PRODUCT,
    });
  });

  it("passes the awaited route id and validated quantity to the service", async () => {
    await PUT(makeRequest({ quantity: 10 }), makeContext("prod-1"));

    expect(mockedProductService.reloadProduct).toHaveBeenCalledWith("prod-1", 10);
  });

  it("returns the guard response without reading the body", async () => {
    const denied = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
    mockedGuard.mockReturnValue(denied);
    const request = makeRequest({ quantity: 10 });

    const response = await PUT(request, makeContext("prod-1"));

    expect(response).toBe(denied);
    expect((request as unknown as { json: jest.Mock }).json).not.toHaveBeenCalled();
    expect(mockedProductService.reloadProduct).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", null, { invalidJson: true }],
    ["missing quantity", {}, {}],
    ["zero quantity", { quantity: 0 }, {}],
    ["fractional quantity", { quantity: 1.5 }, {}],
  ])("returns 400 for %s", async (_label, body, options) => {
    const response = await PUT(
      makeRequest(body, options),
      makeContext("prod-1")
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockedProductService.reloadProduct).not.toHaveBeenCalled();
  });

  it("returns 404 when the product does not exist", async () => {
    mockedProductService.reloadProduct.mockRejectedValue(
      new ItemNotFoundException("product not found")
    );

    const response = await PUT(makeRequest({ quantity: 10 }), makeContext("missing"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.message).toBe("product not found");
  });

  it("returns 500 when reloading fails in the database", async () => {
    mockedProductService.reloadProduct.mockRejectedValue(
      new DBException("Query failed", new Error("connection refused"))
    );

    const response = await PUT(makeRequest({ quantity: 10 }), makeContext("prod-1"));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it("returns 400 for a service-level business rule failure", async () => {
    mockedProductService.reloadProduct.mockRejectedValue(
      new BadRequestException("invalid reload")
    );

    const response = await PUT(makeRequest({ quantity: 10 }), makeContext("prod-1"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.message).toBe("BadRequestException: invalid reload");
  });
});
