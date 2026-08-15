import { NextRequest, NextResponse } from "next/server";
import bycrypt from "bcrypt";

import logger from "@/utils/logger";
import { loginSchema } from "@/schemaValidations/schema";

import { LoginResponse } from "@/types/User";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";

import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { user_serivice } from "@/services/user_service";
import { auth_service } from "@/services/auth_service";

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
    //validate email and pass if macth
    const user=await user_serivice.ValidateUser(data.email,data.password);
     // ✅ Create response first
    const loginResponse: LoginResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      created_at: user.created_at,
    };

    const response = NextResponse.json(
      { 
        success: true,
        message: "Login successful", 
        data: loginResponse 
      },
      { status: 200 }
    );
    //generate cookies and hashed rerfresh
    await auth_service.persist_auth(response,{user_id:user.id});

      //update logegd user
      await user_serivice.Update_VerfiedUser(user.email);
    
  

    

    logger.info(`User ${user.email} logged in successfully`);

    return response;
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