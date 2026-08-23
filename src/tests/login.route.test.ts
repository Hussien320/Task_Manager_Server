// src/tests/auth/login.route.test.ts
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/login/route";
import { user_serivice } from "@/services/user_service";
import { auth_service } from "@/services/auth_service";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { ROLE } from "@/types/roles";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/user_service", () => ({
  user_serivice: {
    ValidateUser: jest.fn(),
    Update_VerfiedUser: jest.fn(),
  },
}));

jest.mock("@/services/auth_service", () => ({
  auth_service: {
    persist_auth: jest.fn(),
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

const mocked_user_service = user_serivice as jest.Mocked<typeof user_serivice>;
const mocked_auth_service = auth_service as jest.Mocked<typeof auth_service>;

// ── Helpers ──────────────────────────────────────────────────────────────────
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

const fake_user = {
  id: "user-1",
  username: "hussien",
  email: "hussien@example.com",
  pass_hash: "hashed-password",
  role: "admin",
  is_verified: false,
  created_at: CREATED_AT,
};

const logged_user = { ...fake_user, is_verified: true };

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
      mocked_user_service.ValidateUser.mockResolvedValue(fake_user as never);
      mocked_user_service.Update_VerfiedUser.mockResolvedValue(logged_user as never);
      mocked_auth_service.persist_auth.mockResolvedValue(undefined as never);
    });

    it("returns 200 with the login payload", async () => {
      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("Login successful");
      expect(json.data).toEqual({
        id: logged_user.id,
        username: logged_user.username,
        email: logged_user.email,
        role: logged_user.role,
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

      expect(mocked_user_service.ValidateUser).toHaveBeenCalledWith(
        validCredentials.email,
        validCredentials.password
      );
      expect(mocked_user_service.Update_VerfiedUser).toHaveBeenCalledWith(fake_user.email);
    });

    it("persists auth cookies/tokens for the validated user", async () => {
      const response = await POST(makeRequest(validCredentials));

      expect(mocked_auth_service.persist_auth).toHaveBeenCalledTimes(1);
      const [passedResponse, payload] = mocked_auth_service.persist_auth.mock.calls[0];
      expect(passedResponse).toBe(response);
      expect(payload).toEqual({ user_id: fake_user.id, user_role: ROLE.ADMIN });
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mocked_user_service.ValidateUser).not.toHaveBeenCalled();
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
      expect(mocked_user_service.ValidateUser).not.toHaveBeenCalled();
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
      mocked_user_service.ValidateUser.mockRejectedValue(
        new ItemNotFoundException("User not found")
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toContain("User not found");
      expect(mocked_auth_service.persist_auth).not.toHaveBeenCalled();
    });

    it("returns 400 when the password does not match", async () => {
      mocked_user_service.ValidateUser.mockRejectedValue(
        new BadRequestException("Bad request: invalid email or password")
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("invalid email or password");
      expect(mocked_user_service.Update_VerfiedUser).not.toHaveBeenCalled();
      expect(mocked_auth_service.persist_auth).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure", async () => {
      mocked_user_service.ValidateUser.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing login");
    });

    it("returns 500 on an unexpected error", async () => {
      mocked_user_service.ValidateUser.mockRejectedValue(new Error("boom"));

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });

    it("returns 500 when persisting the auth tokens fails", async () => {
      mocked_user_service.ValidateUser.mockResolvedValue(fake_user as never);
      mocked_user_service.Update_VerfiedUser.mockResolvedValue(logged_user as never);
      mocked_auth_service.persist_auth.mockRejectedValue(new Error("jwt signing failed"));

      const response = await POST(makeRequest(validCredentials));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });
  });
});
