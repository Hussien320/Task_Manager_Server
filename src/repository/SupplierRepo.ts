import {ProductType, Supplier } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { DBException ,ItemExists, ItemNotFoundException} from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";

export class SupplierRepo{
    private static instance:SupplierRepo;
    static getInstance():SupplierRepo{
        if(!SupplierRepo.instance){
            SupplierRepo.instance=new SupplierRepo();
        }
        return SupplierRepo.instance;
    }
    async getAllSuppliers():Promise<Supplier[]>{
        try{
            const suppliers=await prisma.supplier.findMany({
                orderBy:[
                    {name:'asc'}
                ],

            })
            return suppliers
        }
        catch(err){
            logger.error('Db coundnot load Suppliers')
            throw new DBException('couldnt load suppliers',err as Error);
        }
    }
    async getActiveSuppliers():Promise<Supplier[]>{
        try{
            const activeSuppliers=await prisma.supplier.findMany({
                where:{

                    is_active:true
                },
                 orderBy:[
                    {name:'asc'}
                ],

            })
            return activeSuppliers;

        }
        catch(error){
            logger.error('error while retrieving the supplier');
            throw new DBException('error while retrieving supplier',error as Error);

        }
    }
     async getSupplierById(id: string): Promise<Supplier | null> {
        try {
            const supplier = await prisma.supplier.findUnique({
                where: { id: id }
            });
            return supplier;
        } catch (error) {
            logger.error('Error retrieving supplier by ID', error);
            throw new DBException('Error retrieving supplier', error as Error);
        }
    }

    async createSupplier(data:{name:string,product_type:ProductType}):Promise<Supplier>{
        try{
            //check if the supplier exists first

            const existing=await prisma.supplier.findFirst({
                where:{
                  name:{
                    equals:data.name,
                    mode:'insensitive'
                  }
                }
            })
            if(existing){
            throw new ItemExists();
            }
            //create the supplier
            const createdSupplier=await prisma.supplier.create({
                data:{
                    name:data.name,
                    product_type:data.product_type,

                }
            })
            return createdSupplier
        }
        catch(error){
              if (error instanceof ItemExists) {
            throw error; // Re-throw duplicate error
        }
            logger.error('error occured while creating supplier',error as Error);
            throw new DBException('error occured while creating supplier',error as Error);
        }
    }
    async updateSupplier(id:string,data:{name?:string,product_type?:ProductType,is_active?:boolean}):Promise<Supplier>{
        try{
            //a rename must not collide with an other supplier (the supplier itself is excluded)
            if(data.name!==undefined){
                const existing=await prisma.supplier.findFirst({
                    where:{
                        name:{
                            equals:data.name,
                            mode:'insensitive'
                        },
                        id:{not:id}
                    }
                })
                if(existing){
                    throw new ItemExists();
                }
            }
            //only the provided fields are written, the rest keep their current value
            const updatedSupplier=await prisma.supplier.update({
                where:{id:id},
                data:{
                    ...(data.name!==undefined && {name:data.name}),
                    ...(data.product_type!==undefined && {product_type:data.product_type}),
                    ...(data.is_active!==undefined && {is_active:data.is_active}),
                }
            })
            return updatedSupplier;
        }
        catch(error){
            if(error instanceof ItemExists){
                throw error; // Re-throw duplicate error
            }
            //P2025: the row disappeared between the service read and this write
            if((error as {code?:string}).code==='P2025'){
                logger.warn(`supplier ${id} not found while updating`);
                throw new ItemNotFoundException('supplier not found');
            }
            logger.error('error while updating the supplier',error as Error);
            throw new DBException('error while updating the supplier',error as Error);
        }
    }
    async softDelete(id:string):Promise<void>{
        try{
           await prisma.supplier.update({
            where:{id:id},
            data:{is_active:false}
           });
        }
        catch(error){
            logger.error('error while updating the  supplier')
            throw new DBException('erroe while updating the supplier',error as Error);
        }
    }
}
export const supplierRepo=SupplierRepo.getInstance();
