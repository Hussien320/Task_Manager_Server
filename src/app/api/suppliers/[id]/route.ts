import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { supplierIdSchema, updateSupplierSchema } from "@/schemaValidations/schema";
import { supplierService } from "@/services/SupplierService";
import { PERMISSION } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request:NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    try{
        const authError=authGuard(request,{requirePermission:PERMISSION.DELETE_SUPPLIER})
        if(authError) return authError;
        const {id}= await params
        await supplierService.softDelete(id);

return new NextResponse(null, { status: 204 });
    }
    catch(error)
{
    return handleRouteError(error, {
        operation: 'deletion',
        permissionMessage: 'You do not have permission to delete supplider',
        itemNotFoundMessage:'Supplier not found'
    });
}
}

export async function PATCH(request:NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    let body;
    try{
        //check if the user has permision to update a supplier
        const authError=authGuard(request,{requirePermission:PERMISSION.UPDATE_SUPPLIER});
        if(authError) return authError;

        const {id}=await params;
        const parsedId=supplierIdSchema.safeParse(id);
        if(!parsedId.success){
            throw new BadRequestException("Invalid supplier id",{
                errors: parsedId.error.issues.map((issue) => ({
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
        const parse=updateSupplierSchema.safeParse(body);
        if (!parse.success) {
            throw new BadRequestException("Invalid update supplier credntials", {
                errors: parse.error.issues.map((issue) => ({
                    path: issue.path,
                    message: issue.message,
                })),
            });
        }
        const {data}=parse;
        const mappedResult=await supplierService.updateSupplier(parsedId.data,{
            name:data.name,
            product_type:data.product_type as ProductType | undefined,
            is_active:data.is_active
        });
        return NextResponse.json({
            success:true,
            message:'updated supplier',
            data:mappedResult
        },
        {status:200}
    )
    }
    catch(error){
        return handleRouteError(error, {
            operation: 'update',
            permissionMessage: 'You do not have permission to update suppliers',
            itemNotFoundMessage:'Supplier not found'
        });
    }
}
