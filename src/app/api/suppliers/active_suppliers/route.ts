import { authGuard } from "@/lib/auth/guard";
import { supplierService } from "@/services/SupplierService";
import { ROLE } from "@/types/Roles";
import { handleRouteError } from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
        try{
            const authError=authGuard(request,{requireRole:ROLE.EMPLOYEE});
            if(authError) return authError;
            const suppliers=await supplierService.getActiveSuppliers();

               return NextResponse.json({
            success:true,
            data:suppliers,
            meta:{
                total:suppliers.total
            }
        })
        }
        catch(error){
            return handleRouteError(error, {
                operation: 'GET /api/suppliers/active_suppliers',
                permissionMessage: 'You do not have permission to view suppliers'
            });
        }
    }
