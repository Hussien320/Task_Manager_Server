// src/tests/verify-reset.route.test.ts
import type { NextRequest } from "next/server";
import bcrypt from "bcrypt";

import { POST } from "@/app/api/auth/verify-reset/route";
import { authService } from "@/services/AuthService";
import { userService } from "@/services/UserService";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/UserService", () => ({
  userService: {
    updatePassword: jest.fn(),
  },
}));

jest.mock("@/services/AuthService", () => ({
  authService: {
    verifyResetToken: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { hash: jest.fn() },
  hash: jest.fn(),
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
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ── Helpers ──────────────────────────────────────────────────────────────────
const HASHED_PASSWORD = "hashed-new-password";

/** Minimal NextRequest stand-in: the route only ever calls `request.json()`. */
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const validBody = {
  email: "hussien@example.com",
  password: "newsecret123",
  token: "483920",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAuthService.verifyResetToken.mockResolvedValue(true);
  mockedUserService.updatePassword.mockResolvedValue(undefined as never);
  (mockedBcrypt.hash as jest.Mock).mockResolvedValue(HASHED_PASSWORD);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/verify-reset", () => {
  describe("successful reset", () => {
    it("returns 200 with a confirmation message", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe("Password updated successfully");
    });

    it("verifies the reset code before touching the password", async () => {
      await POST(makeRequest(validBody));

      expect(mockedAuthService.verifyResetToken).toHaveBeenCalledWith(
        validBody.email,
        validBody.token
      );
    });

    it("stores the new password hashed, never in plain text", async () => {
      await POST(makeRequest(validBody));

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(validBody.password, 10);
      expect(mockedUserService.updatePassword).toHaveBeenCalledWith(
        validBody.email,
        HASHED_PASSWORD
      );
      expect(mockedUserService.updatePassword).not.toHaveBeenCalledWith(
        validBody.email,
        validBody.password
      );
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("request body must be valid JSON");
      expect(mockedAuthService.verifyResetToken).not.toHaveBeenCalled();
    });

    it.each([
      ["missing email", { password: "newsecret123", token: "483920" }],
      ["missing password", { email: "hussien@example.com", token: "483920" }],
      ["missing token", { email: "hussien@example.com", password: "newsecret123" }],
      [
        "malformed email",
        { email: "not-an-email", password: "newsecret123", token: "483920" },
      ],
      [
        "password shorter than 6 chars",
        { email: "hussien@example.com", password: "123", token: "483920" },
      ],
      ["empty body", {}],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("Invalid reset credntials");
      expect(mockedAuthService.verifyResetToken).not.toHaveBeenCalled();
      expect(mockedUserService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe("invalid reset token", () => {
    it("returns 400 when the code does not verify", async () => {
      mockedAuthService.verifyResetToken.mockResolvedValue(false);

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("Invalid Token");
    });

    it("leaves the password untouched when the code does not verify", async () => {
      mockedAuthService.verifyResetToken.mockResolvedValue(false);

      await POST(makeRequest(validBody));

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockedUserService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 when verifying the token throws", async () => {
      mockedAuthService.verifyResetToken.mockRejectedValue(new Error("db down"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(mockedUserService.updatePassword).not.toHaveBeenCalled();
    });

    it("returns 500 when persisting the new password fails", async () => {
      mockedUserService.updatePassword.mockRejectedValue(new Error("write failed"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });
  });
});
