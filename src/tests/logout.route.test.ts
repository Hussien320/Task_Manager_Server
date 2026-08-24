// src/tests/logout.route.test.ts
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/logout/route";
import { authService } from "@/services/AuthService";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/AuthService", () => ({
  authService: {
    logout: jest.fn(),
    clearAuthCookies: jest.fn(),
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

const mockedAuthService = authService as jest.Mocked<typeof authService>;

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Minimal NextRequest stand-in: the route only ever reads `x-user-id`. */
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

const USER_ID = "user-1";

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  describe("successful logout", () => {
    it("returns 200 with a success payload", async () => {
      const response = await POST(makeRequest({ "x-user-id": USER_ID }));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ success: true, message: "Logged out successfully" });
    });

    it("revokes the stored session for the caller", async () => {
      await POST(makeRequest({ "x-user-id": USER_ID }));

      expect(mockedAuthService.logout).toHaveBeenCalledWith(USER_ID);
    });

    it("clears the auth cookies on the returned response", async () => {
      const response = await POST(makeRequest({ "x-user-id": USER_ID }));

      expect(mockedAuthService.clearAuthCookies).toHaveBeenCalledTimes(1);
      expect(mockedAuthService.clearAuthCookies).toHaveBeenCalledWith(response);
    });
  });

  describe("missing identity", () => {
    it("returns 401 when the x-user-id header is absent", async () => {
      const response = await POST(makeRequest());
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ success: false, message: "Unauthorized" });
    });

    it("does not touch the session when unauthorized", async () => {
      await POST(makeRequest());

      expect(mockedAuthService.logout).not.toHaveBeenCalled();
      expect(mockedAuthService.clearAuthCookies).not.toHaveBeenCalled();
    });

    it("returns 401 when the x-user-id header is empty", async () => {
      const response = await POST(makeRequest({ "x-user-id": "" }));

      expect(response.status).toBe(401);
      expect(mockedAuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 when revoking the session fails", async () => {
      mockedAuthService.logout.mockRejectedValue(new Error("db down"));

      const response = await POST(makeRequest({ "x-user-id": USER_ID }));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ success: false, message: "Logout failed" });
      expect(mockedAuthService.clearAuthCookies).not.toHaveBeenCalled();
    });

    it("returns 500 when clearing the cookies fails", async () => {
      mockedAuthService.clearAuthCookies.mockImplementation(() => {
        throw new Error("cookie jar broken");
      });

      const response = await POST(makeRequest({ "x-user-id": USER_ID }));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ success: false, message: "Logout failed" });
    });
  });
});
