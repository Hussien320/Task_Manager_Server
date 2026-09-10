import { NextRequest ,NextResponse} from 'next/server';
   import handleRouteError from '@/utils/handleRouteError';
import { PERMISSION } from '@/types/Roles';
import { authGuard } from '@/lib/auth/guard';
import { BadRequestException } from '@/utils/exceptions/http/BadRequestException';
import { updateProductquantitySchema } from '@/schemaValidations/schema';
import { productservice } from '@/services/ProductService';

export async function PUT(request: NextRequest,{params}:{params:Promise<{id:string}>}) {
    let body;
    try{
        const autherror=authGuard(request,{requirePermission:PERMISSION.RELOAD_PRODUCT});
        if(autherror) return autherror;
        const {id}=await params;
        try{
            body = await request.json();
        }
        catch{
            throw new BadRequestException("Bad request: request body must be valid JSON");
        }
        const parssed=updateProductquantitySchema.safeParse(body);
        if(!parssed.success){
            throw new BadRequestException("Bad request: invalid product quantity");
        }
        const {quantity}=parssed.data;
        const mappedresponse=await productservice.reloadProduct(id,quantity);
        return NextResponse.json({
            success:true,
            message:"Product reloaded successfully",
            data:mappedresponse
        },
        {status:200}
        )


    }
    catch(error){
        return handleRouteError(error, {
            operation: 'Update Product',
            permissionMessage: 'You do not have permission to update product',
            itemNotFoundMessage: 'product not found',
        });
    }}
