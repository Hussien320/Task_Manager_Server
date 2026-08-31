import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { ROLE } from "@/types/Roles";
import handleRouteError from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";
import { success } from "zod";

export async function GET(request:NextRequest,{ params }: { params: Promise<{ id: string }> }){
    try{
        const autherror=authGuard(request,{requireRole:ROLE.ADMIN});
        if(autherror) return autherror;
        const {id}=await params;
        const response=await productservice.GetproductHistory(id);
        return NextResponse.json({
            success:true,
            data:response
        })


    }
    catch(error){
         return handleRouteError(error, {
                            operation: 'GET History',
                            permissionMessage: 'You do not have permission to view history',
                            itemNotFoundMessage:'Product Not found'
                            
                            
                        });
    }
}