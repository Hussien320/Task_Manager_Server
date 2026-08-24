// src/tests/forgot-password.route.test.ts
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/forgot-password/route";
import { emailService } from "@/lib/EmailService";
import { authService } from "@/services/AuthService";
import { userService } from "@/services/UserService";
import { ROLE } from "@/types/Roles";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/UserService", () => ({
  userService: {
    getUserByEmail: jest.fn(),
  },
}));

jest.mock("@/services/AuthService", () => ({
  authService: {
    persistReset: jest.fn(),
  },
}));

jest.mock("@/lib/EmailService", () => ({
  emailService: {
    sendResetPasswordEmail: jest.fn(),
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
const mockedEmailService = emailService as jest.Mocked<typeof emailService>;

// ── Helpers ──────────────────────────────────────────────────────────────────
const RESET_CODE = "483920";

const fakeUser = {
  id: "user-1",
  username: "hussien",
  email: "hussien@example.com",
  pass_hash: "hashed-password",
  role: "employee",
  is_verified: false,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

/** Minimal NextRequest stand-in: the route only ever calls `req.json()`. */
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const validBody = { email: "hussien@example.com" };

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserService.getUserByEmail.mockResolvedValue(fakeUser as never);
  mockedAuthService.persistReset.mockResolvedValue(RESET_CODE);
  mockedEmailService.sendResetPasswordEmail.mockResolvedValue(undefined as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  describe("successful request", () => {
    it("returns 200 with a confirmation message", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe("sent the otp in email");
    });

    it("looks the user up by the submitted email", async () => {
      await POST(makeRequest(validBody));

      expect(mockedUserService.getUserByEmail).toHaveBeenCalledWith(validBody.email);
    });

    it("persists a reset token for that user", async () => {
      const response = await POST(makeRequest(validBody));

      expect(mockedAuthService.persistReset).toHaveBeenCalledTimes(1);
      const [passedResponse, payload] = mockedAuthService.persistReset.mock.calls[0];
      expect(passedResponse).toBe(response);
      expect(payload).toEqual({ userId: fakeUser.id, userRole: ROLE.EMPLOYEE });
    });

    it("emails the generated code to the user", async () => {
      await POST(makeRequest(validBody));

      expect(mockedEmailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        fakeUser.email,
        RESET_CODE
      );
    });

    it("never returns the reset code in the response body", async () => {
      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(JSON.stringify(json)).not.toContain(RESET_CODE);
    });

    it("still returns 200 when sending the email fails", async () => {
      mockedEmailService.sendResetPasswordEmail.mockRejectedValue(
        new Error("smtp unreachable")
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe("sent the otp in email");
    });
  });

  describe("request body validation", () => {
    it("returns 400 when the body is not valid JSON", async () => {
      const response = await POST(makeRequest(null, { invalidJson: true }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("json must be givin");
      expect(mockedUserService.getUserByEmail).not.toHaveBeenCalled();
    });

    it.each([
      ["missing email", {}],
      ["empty email", { email: "" }],
      ["malformed email", { email: "not-an-email" }],
      ["non-string email", { email: 12345 }],
    ])("returns 400 for %s", async (_label, body) => {
      const response = await POST(makeRequest(body));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.message).toContain("Invalid forgot_pass credntials");
      expect(mockedUserService.getUserByEmail).not.toHaveBeenCalled();
      expect(mockedEmailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe("unknown user", () => {
    it("returns 404 when no user matches the email", async () => {
      mockedUserService.getUserByEmail.mockRejectedValue(
        new ItemNotFoundException("user not found")
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.message).toContain("user not found");
      expect(mockedAuthService.persistReset).not.toHaveBeenCalled();
      expect(mockedEmailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 on a database failure", async () => {
      mockedUserService.getUserByEmail.mockRejectedValue(
        new DBException("Query failed", new Error("connection refused"))
      );

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Database error while processing forgot password");
    });

    it("returns 500 when persisting the reset token fails", async () => {
      mockedAuthService.persistReset.mockRejectedValue(new Error("hash failed"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
      expect(mockedEmailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it("returns 500 on an unexpected error", async () => {
      mockedUserService.getUserByEmail.mockRejectedValue(new Error("boom"));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });

    it("returns 500 when the stored role is not a known role", async () => {
      // toRole() throws a plain Error for unmapped roles -> falls through to 500
      mockedUserService.getUserByEmail.mockResolvedValue({
        ...fakeUser,
        role: "wizard",
      } as never);

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.message).toBe("Internal server error");
    });
  });
});
