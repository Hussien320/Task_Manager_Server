import { authGuard } from "@/lib/auth/guard";
import { getUserIdFromRequest } from "@/lib/auth/requestHelper";
import {  withdrawProductSchema } from "@/schemaValidations/schema";
import { productservice } from "@/services/ProductService";
import { ROLE } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import handleRouteError from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){
     let body;
     try{
        const autherror=authGuard(request,{requireRole:ROLE.EMPLOYEE});
        if(autherror) throw autherror;
          try{
                    body=await request.json();
                }
                catch(error){
                      throw new BadRequestException("Bad request: request body must be valid JSON");
        
                }
            const parse=withdrawProductSchema.safeParse(body);
               if (!parse.success) {
      throw new BadRequestException("Invalid withdraw product credntials", {
        errors: parse.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
        const {data}=parse;
        const user_id=getUserIdFromRequest(request);
        const mapped_response=await productservice.withdrawProduct(user_id as string,{productname:data.name,quantity:data.quantity})
  return NextResponse.json({
            success:true,
            message:'withdraw product',
            data:mapped_response
        },
        {status:200}
    )
        


     }
     catch(error){
      
                   return handleRouteError(error, {
                          operation: 'withdraw',
                          permissionMessage: 'You do not have permission to withdraw product',
                          
                      });
     }
}