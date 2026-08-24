

import { ProductType } from "@/app/generated/prisma/enums";
import { suplier_repo } from "@/repository/supplier_repo";
import { SupplierListResponse, SupplierResponse, toSupplierResponse, toSupplierResponseArray } from "@/types/Supplier";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";



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
    async Get_Active_Suppliers():Promise<SupplierListResponse >{
        const active_suppliers=await suplier_repo.Get_Active_Suppliers()
         const mapped_response= toSupplierResponseArray(active_suppliers);
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
        async Update_Supplier(id:string,data:{name?:string,product_type?:ProductType,is_active?:boolean}):Promise<SupplierResponse>{
            //the supplier has to exist before anything is written
            const target_supplier=await suplier_repo.Get_Supplier_By_Id(id);

            if(!target_supplier){
                throw new ItemNotFoundException('supplier not found');
            }
            //keep only the fields that really differ from what is stored
            const changes:{name?:string,product_type?:ProductType,is_active?:boolean}={};

            if(data.name!==undefined && data.name!==target_supplier.name){
                changes.name=data.name;
            }
            if(data.product_type!==undefined && data.product_type!==target_supplier.product_type){
                changes.product_type=data.product_type;
            }
            if(data.is_active!==undefined && data.is_active!==target_supplier.is_active){
                changes.is_active=data.is_active;
            }
            if(Object.keys(changes).length===0){
                throw new BadRequestException('No changes to apply, the supplier already has these values');
            }
            const updated_supplier=await suplier_repo.Update_Supplier(id,changes);
            return toSupplierResponse(updated_supplier);
        }
        async Soft_Delete(id:string):Promise<void>{
            //check if the supplier is already set to inactive
            const target_supplier=await suplier_repo.Get_Supplier_By_Id(id);

            if(!target_supplier){
                throw new ItemNotFoundException('supplier not found');
            }
            if (!target_supplier.is_active) {
                throw new BadRequestException('Supplier already deactivated');
            }
            //supplier is active
            await suplier_repo.softDelete(id);
        }

    }
 

export const supplier_service=Supplier_Service.getinstance();