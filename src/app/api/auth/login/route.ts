import { NextRequest, NextResponse } from "next/server";
import bycrypt from "bcrypt";

import logger from "@/utils/logger";
import { loginSchema } from "@/schemaValidations/schema";
import { User_Repo } from "@/Repository/user_repo";
import { LoginResponse } from "@/types/User";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Bad request: request body must be valid JSON" },
        { status: 400 }
      );
    }

    const parse = loginSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          error: parse.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { data } = parse;
    const repo = new User_Repo();
    const targetUser = await repo.GetByEmail(data.email);

    if (!targetUser) {
      logger.warn("Login attempt failed: User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!bycrypt.compareSync(data.password, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      return NextResponse.json(
        { message: "Bad request: invalid email or password" },
        { status: 400 }
      );
    }

    await repo.Update_Loged_User(targetUser.email);

    const loginResponse: LoginResponse = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      is_verified: targetUser.is_verified,
      created_at: targetUser.created_at,
    };

    logger.info(`User ${targetUser.email} logged in successfully`);

    return NextResponse.json(
      { message: "Login successful", Login: loginResponse },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Login route failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}