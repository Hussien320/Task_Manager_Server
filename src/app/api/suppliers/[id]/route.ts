import { authGuard } from "@/lib/auth/guard";
import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";
import { AuthorizationException, InsufficientPermissionsException, InvalidRoleException } from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request:NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    try{
        const autherror=authGuard(request,{requirePermission:PERMISSION.DELETE_SUPPLIER})
        if(autherror) return autherror;
        const {id}= await params
        await supplier_service.Soft_Delete(id);
      
return new NextResponse(null, { status: 204 });
    }
    catch(error)
{
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
         if (error instanceof InsufficientPermissionsException) {
            logger.warn(`Permission denied: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'You do not have permission to delete supplider',
                    errorType: 'InsufficientPermissionsException'
                },
                { status: 403 }
            );
        }
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
        { message: "Database error while processing deletion" },
        { status: 500 }
      );
    }
     logger.error("delet route failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );


}
}
