import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bycrypt from "bcrypt";
import logger from "@/utils/logger";

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

    const { email, password } = body || {};

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { message: "Bad request: email is required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Bad request: email format is invalid" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { message: "Bad request: password is required" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    if (!targetUser) {
      logger.warn("Login attempt failed: User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!bycrypt.compareSync(password, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      return NextResponse.json(
        { message: "Bad request: invalid email or password" },
        { status: 400 }
      );
    }

    const updateUser = await prisma.user.update({
      where: { email: targetUser.email },
      data: { is_verified: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_verified: true,
        created_at: true,
      },
    });

    logger.info(`User ${updateUser.email} logged in successfully`);

    return NextResponse.json(
      { message: "Login successful", data: { user: updateUser } },
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