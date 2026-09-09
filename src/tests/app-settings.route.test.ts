import { NextResponse, type NextRequest } from "next/server";

import { ProductType } from "@/app/generated/prisma/enums";
import { GET } from "@/app/api/app-settings/route";
import { PUT } from "@/app/api/app-settings/threshold/route";
import { authGuard } from "@/lib/auth/guard";
import { appSettingService } from "@/services/AppSettingService";
import { ROLE } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException } from "@/utils/exceptions/RepoException";

jest.mock("@/lib/auth/guard", () => ({
  authGuard: jest.fn(),
}));

jest.mock("@/services/AppSettingService", () => ({
  appSettingService: {
    getAllSettings: jest.fn(),
    updateSettingValue: jest.fn(),
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
const mockedAppSettingService = appSettingService as jest.Mocked<typeof appSettingService>;

function makeRequest(
  body: unknown = undefined,
  { invalidJson = false, userId = "admin-1" as string | null } = {}
): NextRequest {
  const headers = new Headers();
  headers.set("x-user-role", ROLE.ADMIN);
  if (userId !== null) headers.set("x-user-id", userId);

  return {
    headers,
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const settings = {
  settings: [
    { setting_key: "VEGTABLE", setting_value: "7" },
    { setting_key: "DAIRY", setting_value: "5" },
  ],
  total: 2,
};

const validBody = {
  category: ProductType.VEGTABLE,
  value: 14,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGuard.mockReturnValue(null);
  mockedAppSettingService.getAllSettings.mockResolvedValue(settings);
  mockedAppSettingService.updateSettingValue.mockResolvedValue(undefined);
});

describe("GET /api/app-settings", () => {
  it("returns 200 with settings and the total in meta", async () => {
    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: settings,
      meta: { total: 2 },
    });
  });

  it("guards the route for admins", async () => {
    const request = makeRequest();

    await GET(request);

    expect(mockedGuard).toHaveBeenCalledWith(request, {
      requireRole: ROLE.ADMIN,
    });
  });

  it("returns the guard response without querying settings", async () => {
    const denied = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
    mockedGuard.mockReturnValue(denied);

    const response = await GET(makeRequest());

    expect(response).toBe(denied);
    expect(mockedAppSettingService.getAllSettings).not.toHaveBeenCalled();
  });

  it("returns 500 when loading settings fails", async () => {
    mockedAppSettingService.getAllSettings.mockRejectedValue(
      new DBException("Query failed", new Error("connection refused"))
    );

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

describe("PUT /api/app-settings/threshold", () => {
  it("returns 200 after updating an app setting", async () => {
    const response = await PUT(makeRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: "App setting updated successfully",
    });
  });

  it("guards the route for admins", async () => {
    const request = makeRequest(validBody);

    await PUT(request);

    expect(mockedGuard).toHaveBeenCalledWith(request, {
      requireRole: ROLE.ADMIN,
    });
  });

  it("forwards the category, value, and x-user-id to the service", async () => {
    await PUT(makeRequest(validBody, { userId: "admin-42" }));

    expect(mockedAppSettingService.updateSettingValue).toHaveBeenCalledWith(
      ProductType.VEGTABLE,
      14,
      "admin-42"
    );
  });

  it("returns the guard response without parsing the body", async () => {
    const denied = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
    mockedGuard.mockReturnValue(denied);
    const request = makeRequest(validBody);

    const response = await PUT(request);

    expect(response).toBe(denied);
    expect((request as unknown as { json: jest.Mock }).json).not.toHaveBeenCalled();
    expect(mockedAppSettingService.updateSettingValue).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", undefined, { invalidJson: true }],
    ["missing category", { value: 14 }, {}],
    ["unknown category", { category: "UNKNOWN", value: 14 }, {}],
    ["zero value", { category: ProductType.VEGTABLE, value: 0 }, {}],
    ["fractional value", { category: ProductType.VEGTABLE, value: 1.5 }, {}],
  ])("returns 400 for %s", async (_label, body, options) => {
    const response = await PUT(makeRequest(body, options));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockedAppSettingService.updateSettingValue).not.toHaveBeenCalled();
  });

  it("returns 400 when x-user-id is missing", async () => {
    const response = await PUT(makeRequest(validBody, { userId: null }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.message).toContain("Missing x-user-id header");
    expect(mockedAppSettingService.updateSettingValue).not.toHaveBeenCalled();
  });

  it("returns 400 for a service-level business rule failure", async () => {
    mockedAppSettingService.updateSettingValue.mockRejectedValue(
      new BadRequestException("invalid setting")
    );

    const response = await PUT(makeRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.message).toBe("BadRequestException: invalid setting");
  });
});
