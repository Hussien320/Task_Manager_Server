import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { createSupplierSchema } from "@/schemaValidations/schema";
import { supplierService } from "@/services/SupplierService";
import { PERMISSION } from "@/types/Roles";

import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request:NextRequest){
    try{
        //check if the user has permision to list the suppliers
        const authError=authGuard(request,{
            requirePermission:PERMISSION.READ_ALL_SUPPLIERS
        });
        if(authError) return authError;
        //get all suppliers
        const suppliers=await supplierService.getAllSuppliers();

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
            operation: 'GET /api/suppliers',
            permissionMessage: 'You do not have permission to view suppliers'
        });
    }
}

export async function POST(req:NextRequest){
    let body;
    try{
    //check if th user has permision to add a supplier
    const authError=authGuard(req,{requirePermission:PERMISSION.CREATE_SUPPLIER});
    if(authError) return authError;
    try {
          body = await req.json();
        } catch {
          throw new BadRequestException("Bad request: request body must be valid JSON");
        }
        const parse=createSupplierSchema.safeParse(body);
         if (!parse.success) {
      throw new BadRequestException("Invalid create supplier credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
        const {data}=parse;
        const mappedResult=await supplierService.createSupplier({name:data.name,product_type:data.product_type as ProductType});
        return NextResponse.json({
            success:true,
            message:'created supplier',
            data:mappedResult
        },
        {status:201}
    )
    }
    catch(error){
        return handleRouteError(error, {
            operation: 'addition',
            permissionMessage: 'You do not have permission to add suppliers',
            itemExistsMessage: 'supplier already created'
        });
    }
}
