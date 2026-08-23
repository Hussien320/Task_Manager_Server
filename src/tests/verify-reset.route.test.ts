// src/tests/auth/verify-reset.route.test.ts
import type { NextRequest } from "next/server";
import bcrypt from "bcrypt";

import { POST } from "@/app/api/auth/verify-reset/route";
import { auth_service } from "@/services/auth_service";
import { user_serivice } from "@/services/user_service";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/user_service", () => ({
  user_serivice: {
    Update_Pass: jest.fn(),
  },
}));

jest.mock("@/services/auth_service", () => ({
  auth_service: {
    verResetToken: jest.fn(),
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

const mocked_user_service = user_serivice as jest.Mocked<typeof user_serivice>;
const mocked_auth_service = auth_service as jest.Mocked<typeof auth_service>;
const mocked_bcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

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
  mocked_auth_service.verResetToken.mockResolvedValue(true);
  mocked_user_service.Update_Pass.mockResolvedValue(undefined as never);
  (mocked_bcrypt.hash as jest.Mock).mockResolvedValue(HASHED_PASSWORD);
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

      expect(mocked_auth_service.verResetToken).toHaveBeenCalledWith(
        validBody.email,
        validBody.token
      );
    });

    it("stores the new password hashed, never in plain text", async () => {
      await POST(makeRequest(validBody));

      expect(mocked_bcrypt.hash).toHaveBeenCalledWith(validBody.password, 10);
      expect(mocked_user_service.Update_Pass).toHaveBeenCalledWith(
        validBody.email,
        HASHED_PASSWORD
      );
      expect(mocked_user_service.Update_Pass).not.toHaveBeenCalledWith(
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
      expect(mocked_auth_service.verResetToken).not.toHaveBeenCalled();
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
      expect(mocked_auth_service.verResetToken).not.toHaveBeenCalled();
      expect(mocked_user_service.Update_Pass).not.toHaveBeenCalled();
    });
  });

  describe("invalid reset token", () => {
    it("returns 400 when the code does not verify", async () => {
      mocked_auth_service.verResetToken.mockResolvedValue(false);

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("Invalid Token");
    });

    it("leaves the password untouched when the code does not verify", async () => {
      mocked_auth_service.verResetToken.mockResolvedValue(false);

      await POST(makeRequest(validBody));

      expect(mocked_bcrypt.hash).not.toHaveBeenCalled();
      expect(mocked_user_service.Update_Pass).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 when verifying the token throws", async () => {
      mocked_auth_service.verResetToken.mockRejectedValue(new Error("db down"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(mocked_user_service.Update_Pass).not.toHaveBeenCalled();
    });

    it("returns 500 when persisting the new password fails", async () => {
      mocked_user_service.Update_Pass.mockRejectedValue(new Error("write failed"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });
  });
});
