import { ResetPassSchema } from "@/schemaValidations/schema";
import { auth_service } from "@/services/auth_service";
import { user_serivice } from "@/services/user_service";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
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
        
            const parse = ResetPassSchema.safeParse(body);
           
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
            const is_validated=await auth_service.verResetToken(data.email,data.token);
            if(!is_validated){
                throw new BadRequestException('Invalid Token')
            }
            //update the pass
           const hashed=await bcrypt.hash(data.password,10);
            await user_serivice.Update_Pass(data.email,hashed);
                logger.info(`Password updated successfully for email: ${data.email}`);
    return NextResponse.json({ message: 'Password updated successfully' },{status:200});

    }
    catch(error){
        if(error  instanceof BadRequestException){
             logger.warn(error.name + ": " + error.message);
      return NextResponse.json(
        { message: error.name + ": " + error.message,
              errors: error.details?.errors || error.details,
                 success:false
        },
        { status: 400 }
      );
        }
        if(error instanceof ItemNotFoundException){
            logger.warn(error.name + ": " + error.message);
      return NextResponse.json(
        { message: error.name + ": " + error.message,
             success:false
        },
        { status: 404 }
      );
        }
        if(error instanceof DBException){
            logger.error(`Database error  ${error.message}`, error);
      return NextResponse.json(
        { message: "Database error while processing " },
        { status: 500 }
      );
        }
         logger.error("verify_reset route failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );

    }
}