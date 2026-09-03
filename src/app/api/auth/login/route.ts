import { NextRequest, NextResponse } from "next/server";


import logger from "@/utils/logger";
import { loginSchema } from "@/schemaValidations/schema";

import { LoginResponse } from "@/types/User";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";

import { userService } from "@/services/UserService";
import { authService } from "@/services/AuthService";
import { toRole } from "@/types/Roles";

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
      throw new BadRequestException("Invalid login credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }

    const { data } = parse;
    //validate email and pass if macth
    const user=await userService.validateUser(data.email,data.password);
     // ✅ Create response first

    //update logegd user
    const updatedUser=  await userService.updateVerifiedUser(user.email);

        const loginResponse: LoginResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      is_verified: updatedUser.is_verified,
      created_at: updatedUser.created_at,
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
    await authService.persistAuth(response,{userId:user.id,userRole:toRole(user.role)});





    logger.info(`User ${user.email} logged in successfully`);

    return response;
  } catch (error) {
    return handleRouteError(error, { operation: 'login',
      itemNotFoundMessage: 'User not found',
     });
  }
}
