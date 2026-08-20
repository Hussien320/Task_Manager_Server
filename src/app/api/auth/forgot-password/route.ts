import { emailService } from "@/lib/email.service";
import { ForgotPassSchema } from "@/schemaValidations/schema";
import { auth_service } from "@/services/auth_service";
import { user_serivice } from "@/services/user_service";
import { toRole } from "@/types/roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException } from "@/utils/exceptions/RepoException";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
import { NextRequest,NextResponse } from "next/server";
;

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
        const parse=ForgotPassSchema.safeParse(body);
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
    const target_user=await user_serivice.GetUser_ByEmail(data.email);
     const response = NextResponse.json(
          { 
          
            message: "sent the otp in email", 
        
          },
          { status: 200 }
        );
    //generate reset token for the pass 
    const code=await auth_service.persist_reset(response,{user_id:target_user.id,user_role:toRole(target_user.role)});
    //email generating service 
      try {
            await emailService.sendResetPasswordEmail(target_user.email, code);
            logger.info(`✅ Reset code sent to ${target_user.email}`);
        } catch (emailError) {
            logger.error(`❌ Failed to send email to ${target_user.email}:`, emailError);
            // Still return success to user, but log the error
            // In production, you might want to handle this differently
        }
    return response;





    
     




        
    }
    catch(error){
       if (error instanceof BadRequestException) {
            logger.warn(error.name + ": " + error.message);
            return NextResponse.json(
              { message: error.name + ": " + error.message},
              { status: 400 }
            );
          }
             if (error instanceof ItemNotFoundException) {
      logger.warn(error.name + ": " + error.message);
      return NextResponse.json({ message: error.name + ": " + error.message }, { status: 404 });
    }
      if (error instanceof DBException) {
      logger.error(`Database error  ${error.message}`, error);
      return NextResponse.json(
        { message: "Database error while processing " },
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