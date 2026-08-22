import { authGuard } from "@/lib/auth/guard";

import { supplier_service } from "@/services/supplier_service";
import { PERMISSION } from "@/types/roles";

import { AuthorizationException, InsufficientPermissionsException, InvalidRoleException } from "@/utils/exceptions/http/AutharizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";

import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request:NextRequest){
    try{
        //check if the user has permision to list the suppliers
        const autherror=authGuard(request,{
            requirePermission:PERMISSION.READ_ALL_SUPPLIERS
        });
        if(autherror) return autherror;
        //get all suppliers
        const suppliers=await supplier_service.Get_All_Suppliers();

        return NextResponse.json({
            success:true,
            data:suppliers,
            meta:{
                total:suppliers.total
            }
        })
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
                    message: 'You do not have permission to view suppliers',
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

        // ============================================
        // HANDLE REPOSITORY EXCEPTIONS
        // ============================================

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

        // ✅ Database error
        if (error instanceof DBException) {
            logger.error(`Database error: ${error.message}`);
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Database error while fetching suppliers',
                    errorType: 'DBException'
                },
                { status: 500 }
            );
        }

        // ============================================
        // HANDLE UNKNOWN ERRORS
        // ============================================

        logger.error('Unexpected error in GET /api/suppliers:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'Internal server error',
                errorType: 'UnknownError'
            },
            { status: 500 }
        );
    }
}

