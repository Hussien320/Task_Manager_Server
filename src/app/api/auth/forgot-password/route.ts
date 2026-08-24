import { emailService } from "@/lib/EmailService";
import { forgotPasswordSchema } from "@/schemaValidations/schema";
import { authService } from "@/services/AuthService";
import { userService } from "@/services/UserService";
import { toRole } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";
import logger from "@/utils/logger";
import { NextRequest,NextResponse } from "next/server";

 export async function POST(req:NextRequest){
    let body;
    try{
        try{
        //step 1 .get the email from the user
        body=await req.json();
        }
        catch{
            throw new BadRequestException('json must be givin');
        }
        //validate the email
        const parse=forgotPasswordSchema.safeParse(body);
          if (!parse.success) {
      throw new BadRequestException("Invalid forgot_pass credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
    const {data}=parse;
    //step.2 get the user
    const targetUser=await userService.getUserByEmail(data.email);
     const response = NextResponse.json(
          {

            message: "sent the otp in email",

          },
          { status: 200 }
        );
    //generate reset token for the pass
    const code=await authService.persistReset(response,{userId:targetUser.id,userRole:toRole(targetUser.role)});
    //email generating service
      try {
            await emailService.sendResetPasswordEmail(targetUser.email, code);
            logger.info(`✅ Reset code sent to ${targetUser.email}`);
        } catch (emailError) {
            logger.error(`❌ Failed to send email to ${targetUser.email}:`, emailError);
            // Still return success to user, but log the error
            // In production, you might want to handle this differently
        }
    return response;







    }
    catch(error){
        return handleRouteError(error, { operation: 'forgot password' });
    }
  }
