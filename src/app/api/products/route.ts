import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { getUserIdFromRequest } from "@/lib/auth/requestHelper";
import { addProductSchema } from "@/schemaValidations/schema";
import { productservice } from "@/services/ProductService";
import { PERMISSION, ROLE } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import handleRouteError from "@/utils/handleRouteError";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { success } from "zod";

export async function POST(request:NextRequest){
    let body;
    try{
        const autherror=authGuard(request,{requireRole:ROLE.EMPLOYEE})
        if(autherror) throw autherror;
        try{
            body=await request.json();
        }
        catch(error){
              throw new BadRequestException("Bad request: request body must be valid JSON");

        }
       
        const parse=addProductSchema.safeParse(body);
      
           if (!parse.success) {
      throw new BadRequestException("Invalid create product credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
    const {data}=parse;
    const user_id=getUserIdFromRequest(request);
    const mappedResult=await productservice.createProduct(user_id as string,{supplier_name:data.supplier_name,name:data.name,category:data.category as ProductType,quantity:data.quantity,price:data.price,expiry_date:data.expiry_date});

  return NextResponse.json({
            success:true,
            message:'created product',
            data:mappedResult
        },
        {status:201}
    )
    

      
         
    
}

    catch(error){
           return handleRouteError(error, {
                  operation: 'addition',
                  permissionMessage: 'You do not have permission to add product',
                  itemExistsMessage: 'product already created'
              });

    }

}
export async function GET(request:NextRequest){
    try{
        const autherror=authGuard(request,{requirePermission:PERMISSION.READ_ALL_PRODUCTS});
        if(autherror) throw autherror
        const mappedresponse=await productservice.getProducts();
        return NextResponse.json({
            success:true,
            data:mappedresponse,
            meta:{
                total:mappedresponse.total
            }
        })
    }
     catch(error){
                return handleRouteError(error, {
                    operation: 'GET /api/products',
                    permissionMessage: 'You do not have permission to view products'
                });
            }
}