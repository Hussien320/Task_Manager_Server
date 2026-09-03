import { resetPasswordSchema } from "@/schemaValidations/schema";
import { authService } from "@/services/AuthService";
import { userService } from "@/services/UserService";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt"
export async function POST(request:NextRequest) {
    let body
    try{
          try {
              body = await request.json();
            } catch {
              throw new BadRequestException("Bad request: request body must be valid JSON");
            }

            const parse = resetPasswordSchema.safeParse(body);

            if (!parse.success) {
                logger.error('Validation failed', {
    errors: parse.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
    })),
});
              throw new BadRequestException("Invalid reset credntials", {
                errors: parse.error.issues.map((issue) => ({
                  path: issue.path,
                  message: issue.message,
                })),
              });
            }
            const {data}=parse
            //validate the token
            const isValidated=await authService.verifyResetToken(data.email,data.token);
            if(!isValidated){
                throw new BadRequestException('Invalid Token')
            }
            //update the pass
           const hashed=await bcrypt.hash(data.password,10);
            await userService.updatePassword(data.email,hashed);
                logger.info(`Password updated successfully for email: ${data.email}`);
    return NextResponse.json({ message: 'Password updated successfully' },{status:200});

    }
    catch(error){
        return handleRouteError(error, { operation: 'verify_reset',
          itemNotFoundMessage: 'User not found',
         });
    }
}
