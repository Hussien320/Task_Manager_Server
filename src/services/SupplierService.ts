

import { ProductType } from "@/app/generated/prisma/enums";
import { supplierRepo } from "@/repository/SupplierRepo";
import { SupplierListResponse, SupplierResponse, toSupplierResponse, toSupplierResponseArray } from "@/types/Supplier";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";



export class SupplierService{
    private static instance:SupplierService
    static getInstance():SupplierService{
        if(!SupplierService.instance){
            SupplierService.instance=new SupplierService();
        }
        return SupplierService.instance;
    }
    async getAllSuppliers():Promise<SupplierListResponse>{

        const suppliers=await supplierRepo.getAllSuppliers();

        const mappedResponse= toSupplierResponseArray(suppliers);
        return {
            suppliers:mappedResponse,
            total:mappedResponse.length
        }
    }
    async getActiveSuppliers():Promise<SupplierListResponse >{
        const activeSuppliers=await supplierRepo.getActiveSuppliers()
         const mappedResponse= toSupplierResponseArray(activeSuppliers);
        return {
            suppliers:mappedResponse,
            total:mappedResponse.length
        }

    }
    async createSupplier(data:{name:string,product_type:ProductType}):Promise<SupplierResponse>{
        const createdSupplier=await supplierRepo.createSupplier({name:data.name,product_type:data.product_type});
        const mappedResult=toSupplierResponse(createdSupplier);
        return mappedResult;

        }
        async updateSupplier(id:string,data:{name?:string,product_type?:ProductType,is_active?:boolean}):Promise<SupplierResponse>{
            //the supplier has to exist before anything is written
            const targetSupplier=await supplierRepo.getSupplierById(id);

            if(!targetSupplier){
                throw new ItemNotFoundException('supplier not found');
            }
            //keep only the fields that really differ from what is stored
            const changes:{name?:string,product_type?:ProductType,is_active?:boolean}={};

            if(data.name!==undefined && data.name!==targetSupplier.name){
                changes.name=data.name;
            }
            if(data.product_type!==undefined && data.product_type!==targetSupplier.product_type){
                changes.product_type=data.product_type;
            }
            if(data.is_active!==undefined && data.is_active!==targetSupplier.is_active){
                changes.is_active=data.is_active;
            }
            if(Object.keys(changes).length===0){
                throw new BadRequestException('No changes to apply, the supplier already has these values');
            }
            const updatedSupplier=await supplierRepo.updateSupplier(id,changes);
            return toSupplierResponse(updatedSupplier);
        }
        async softDelete(id:string):Promise<void>{
            //check if the supplier is already set to inactive
            const targetSupplier=await supplierRepo.getSupplierById(id);

            if(!targetSupplier){
                throw new ItemNotFoundException('supplier not found');
            }
            if (!targetSupplier.is_active) {
                throw new BadRequestException('Supplier already deactivated');
            }
            //supplier is active
            await supplierRepo.softDelete(id);
        }

    }


export const supplierService=SupplierService.getInstance();
