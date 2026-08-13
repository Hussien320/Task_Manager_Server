import { NextRequest, NextResponse } from "next/server";
import bycrypt from "bcrypt";

import logger from "@/utils/logger";
import { loginSchema } from "@/schemaValidations/schema";
import { User_Repo } from "@/Repository/user_repo";
import { LoginResponse } from "@/types/User";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";

import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new BadRequestException("Bad request: request body must be valid JSON");
    }

    const parse = loginSchema.safeParse(body);

    if (!parse.success) {
      throw new BadRequestException("Invalid login payload", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }

    const { data } = parse;
    const repo = new User_Repo();
    const targetUser = await repo.GetByEmail(data.email);

    if (!targetUser) {
      throw new ItemNotFoundException("User not found");
    }

    if (!bycrypt.compareSync(data.password, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      throw new BadRequestException("Bad request: invalid email or password");
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
    if (error instanceof ItemNotFoundException) {
      logger.warn(error.name + ": " + error.message);
      return NextResponse.json({ message: error.name + ": " + error.message }, { status: 404 });
    }
    if (error instanceof BadRequestException) {
      logger.warn(error.name + ": " + error.message);
      return NextResponse.json(
        { message: error.name + ": " + error.message},
        { status: 400 }
      );
    
    }

    if (error instanceof DBException) {
      logger.error(`Database error during login: ${error.message}`, error);
      return NextResponse.json(
        { message: "Database error while processing login" },
        { status: 500 }
      );
    }


    logger.error("Login route failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}