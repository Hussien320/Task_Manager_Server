import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { CreatSupplierSchema } from "@/schemaValidations/schema";
import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";

import { AuthorizationException, InsufficientPermissionsException, InvalidRoleException } from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemExists } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
import { NextRequest,NextResponse } from "next/server";


export async function POST(req:NextRequest){
    let body;
    try{
    //check if th user has permision to add a supplier
    const auth_error=authGuard(req,{requirePermission:PERMISSION.CREATE_SUPPLIER});
    if(auth_error) return auth_error;
    try {
          body = await req.json();
        } catch {
          throw new BadRequestException("Bad request: request body must be valid JSON");
        }
        const parse=CreatSupplierSchema.safeParse(body);
         if (!parse.success) {
      throw new BadRequestException("Invalid create supplier credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
        const {data}=parse;
        const mapped_result=await supplier_service.Creat_Supplier({name:data.name,product_type:data.product_type as ProductType});
        return NextResponse.json({
            success:true,
            message:'created supplier',
            data:mapped_result
        },
        {status:200}
    )
    }
    catch(error){
 if (error instanceof InvalidRoleException) {
            logger.error(`Invalid role: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Invalid user role',
                    errorType: 'InvalidRoleException'
                },
                { status: 403 }
            );
        }
        if(error instanceof ItemExists){
            logger.error('supplier already there');
            return NextResponse.json({
                success:false,
                message:'supplier already created',
                errorType:'ItemExists'
            }
        ,
        {status:400}
        )
        }

        // ✅ Insufficient permissions (valid role but missing permission)
        if (error instanceof InsufficientPermissionsException) {
            logger.warn(`Permission denied: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'You do not have permission to add suppliers',
                    errorType: 'InsufficientPermissionsException'
                },
                { status: 403 }
            );
        }

        // ✅ Authorization error (wrong role for route)
        if (error instanceof AuthorizationException) {
            logger.warn(`Authorization failed: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: error.message || 'Authorization failed',
                    errorType: 'AuthorizationException'
                },
                { status: 403 }
            );
        }

        // ✅ Authentication error (token invalid/expired)
        if (error instanceof AuthenticationException) {
            logger.warn(`Authentication failed: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Authentication failed. Please login again.',
                    errorType: 'AuthenticationException'
                },
                { status: 401 }
            );
        }
         if (error instanceof BadRequestException) {
      logger.warn(error.name + ": " + error.message);
      return NextResponse.json(
        {message: error.name + ": " + error.message,
            errors: error.details?.errors || error.details, // ← Include details
            success: false},
        { status: 400 }
      );
    
    }
     if (error instanceof DBException) {
      logger.error(`Database error during addidtion: ${error.message}`, error);
      return NextResponse.json(
        { message: "Database error while processing addition" },
        { status: 500 }
      );
    }


    logger.error("add supplier route failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }

    
}