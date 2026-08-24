import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { SupplierIdSchema, UpdateSupplierSchema } from "@/schemaValidations/schema";
import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";
import { AuthorizationException, InsufficientPermissionsException, InvalidRoleException } from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemExists, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request:NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    let body;
    try{
        //check if the user has permision to update a supplier
        const autherror=authGuard(request,{requirePermission:PERMISSION.UPDATE_SUPPLIER});
        if(autherror) return autherror;

        const {id}=await params;
        const parsed_id=SupplierIdSchema.safeParse(id);
        if(!parsed_id.success){
            throw new BadRequestException("Invalid supplier id",{
                errors: parsed_id.error.issues.map((issue) => ({
                    path: ['id'],
                    message: issue.message,
                })),
            });
        }
        try {
            body = await request.json();
        } catch {
            throw new BadRequestException("Bad request: request body must be valid JSON");
        }
        const parse=UpdateSupplierSchema.safeParse(body);
        if (!parse.success) {
            throw new BadRequestException("Invalid update supplier credntials", {
                errors: parse.error.issues.map((issue) => ({
                    path: issue.path,
                    message: issue.message,
                })),
            });
        }
        const {data}=parse;
        const mapped_result=await supplier_service.Update_Supplier(parsed_id.data,{
            name:data.name,
            product_type:data.product_type as ProductType | undefined,
            is_active:data.is_active
        });
        return NextResponse.json({
            success:true,
            message:'updated supplier',
            data:mapped_result
        },
        {status:200}
    )
    }
    catch(error){
        // ✅ Invalid role (role doesn't exist in system)
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

        // ✅ Insufficient permissions (valid role but missing permission)
        if (error instanceof InsufficientPermissionsException) {
            logger.warn(`Permission denied: ${error.message}`);
            return NextResponse.json(
                {
                    success: false,
                    message: 'You do not have permission to update suppliers',
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

        // ✅ Another supplier already carries the new name
        if (error instanceof ItemExists) {
            logger.warn('supplier name already taken');
            return NextResponse.json(
                {
                    success: false,
                    message: 'Another supplier already uses this name',
                    errorType: 'ItemExists'
                },
                { status: 400 }
            );
        }

        // ✅ Item not found
        if (error instanceof ItemNotFoundException) {
            logger.warn(`Item not found: ${error.message}`);
            return NextResponse.json(
                {
                    success: false,
                    message: error.message || 'Resource not found',
                    errorType: 'ItemNotFoundException'
                },
                { status: 404 }
            );
        }

        // ✅ Validation / business rule failure
        if (error instanceof BadRequestException) {
            logger.warn(error.name + ": " + error.message);
            return NextResponse.json(
                {
                    message: error.name + ": " + error.message,
                    errors: error.details?.errors || error.details, // ← Include details
                    success: false
                },
                { status: 400 }
            );
        }

        // ✅ Database error
        if (error instanceof DBException) {
            logger.error(`Database error during update: ${error.message}`, error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Database error while processing update",
                    errorType: 'DBException'
                },
                { status: 500 }
            );
        }

        logger.error("update supplier route failed", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                errorType: 'UnknownError'
            },
            { status: 500 }
        );
    }
}
