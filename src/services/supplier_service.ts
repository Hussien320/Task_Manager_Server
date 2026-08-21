

import { ProductType } from "@/app/generated/prisma/enums";
import { suplier_repo } from "@/repository/supplier_repo";
import { SupplierListResponse, SupplierResponse, toSupplierResponse, toSupplierResponseArray } from "@/types/Supplier";

export class Supplier_Service{
    private static instance:Supplier_Service
    static getinstance():Supplier_Service{
        if(!Supplier_Service.instance){
            Supplier_Service.instance=new Supplier_Service();
        }
        return Supplier_Service.instance;
    }
    async Get_All_Suppliers():Promise<SupplierListResponse>{
        
        const suppliers=await suplier_repo.Get_All_Suppliers();

        const mapped_response= toSupplierResponseArray(suppliers);
        return {
            suppliers:mapped_response,
            total:mapped_response.length
        }
    }
    async Creat_Supplier(data:{name:string,product_type:ProductType}):Promise<SupplierResponse>{
        const created_supplier=await suplier_repo.Create_Supplier({name:data.name,product_type:data.product_type});
        const mapped_result=toSupplierResponse(created_supplier);
        return mapped_result;
           
        }

    }
 

export const supplier_service=Supplier_Service.getinstance();