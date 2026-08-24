// src/tests/login.route.test.ts
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/login/route";
import { userService } from "@/services/UserService";
import { authService } from "@/services/AuthService";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { ROLE } from "@/types/Roles";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/UserService", () => ({
  userService: {
    validateUser: jest.fn(),
    updateVerifiedUser: jest.fn(),
  },
}));

jest.mock("@/services/AuthService", () => ({
  authService: {
    persistAuth: jest.fn(),
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

const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// ── Helpers ──────────────────────────────────────────────────────────────────
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

const fakeUser = {
  id: "user-1",
  username: "hussien",
  email: "hussien@example.com",
  pass_hash: "hashed-password",
  role: "admin",
  is_verified: false,
  created_at: CREATED_AT,
};

const loggedUser = { ...fakeUser, is_verified: true };

/** Minimal NextRequest stand-in: the route only ever calls `request.json()`. */
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const validCredentials = {
  email: "hussien@example.com",
  password: "secret123",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  describe("successful login", () => {
    beforeEach(() => {
      mockedUserService.validateUser.mockResolvedValue(fakeUser as never);
      mockedUserService.updateVerifiedUser.mockResolvedValue(loggedUser as never);
      mockedAuthService.persistAuth.mockResolvedValue(undefined as never);
    });

    it("returns 200 with the login payload", async () => {
      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("Login successful");
      expect(json.data).toEqual({
        id: loggedUser.id,
        username: loggedUser.username,
        email: loggedUser.email,
        role: loggedUser.role,
        is_verified: true,
        created_at: CREATED_AT.toISOString(),
      });
    });

    it("never leaks the password hash", async () => {
      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(json.data).not.toHaveProperty("pass_hash");
    });

    it("validates the credentials then marks the user as logged in", async () => {
      await POST(makeRequest(validCredentials));

      expect(mockedUserService.validateUser).toHaveBeenCalledWith(
        validCredentials.email,
        validCredentials.password
      );
      expect(mockedUserService.updateVerifiedUser).toHaveBeenCalledWith(fakeUser.email);
    });

    it("persists auth cookies/tokens for the validated user", async () => {
      const response = await POST(makeRequest(validCredentials));

      expect(mockedAuthService.persistAuth).toHaveBeenCalledTimes(1);
      const [passedResponse, payload] = mockedAuthService.persistAuth.mock.calls[0];
      expect(passedResponse).toBe(response);
      expect(payload).toEqual({ userId: fakeUser.id, userRole: ROLE.ADMIN });
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mockedUserService.validateUser).not.toHaveBeenCalled();
    });

    it.each([
      ["missing email", { password: "secret123" }],
      ["missing password", { email: "hussien@example.com" }],
      ["malformed email", { email: "not-an-email", password: "secret123" }],
      ["password shorter than 6 chars", { email: "hussien@example.com", password: "123" }],
      ["empty body", {}],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid login credntials");
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.length).toBeGreaterThan(0);
      expect(mockedUserService.validateUser).not.toHaveBeenCalled();
    });

    it("reports the offending field in the validation errors", async () => {
      const response = await POST(
        makeRequest({ email: "not-an-email", password: "secret123" })
      );
      const json = await response.json();

      expect(json.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["email"] })])
      );
    });
  });

  describe("failed authentication", () => {
    it("returns 404 when the user does not exist", async () => {
      mockedUserService.validateUser.mockRejectedValue(
        new ItemNotFoundException("User not found")
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toContain("User not found");
      expect(mockedAuthService.persistAuth).not.toHaveBeenCalled();
    });

    it("returns 400 when the password does not match", async () => {
      mockedUserService.validateUser.mockRejectedValue(
        new BadRequestException("Bad request: invalid email or password")
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("invalid email or password");
      expect(mockedUserService.updateVerifiedUser).not.toHaveBeenCalled();
      expect(mockedAuthService.persistAuth).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure", async () => {
      mockedUserService.validateUser.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing login");
    });

    it("returns 500 on an unexpected error", async () => {
      mockedUserService.validateUser.mockRejectedValue(new Error("boom"));

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });

    it("returns 500 when persisting the auth tokens fails", async () => {
      mockedUserService.validateUser.mockResolvedValue(fakeUser as never);
      mockedUserService.updateVerifiedUser.mockResolvedValue(loggedUser as never);
      mockedAuthService.persistAuth.mockRejectedValue(new Error("jwt signing failed"));

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });
  });
});
