import {ProductType, Supplier } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { DBException ,ItemExists} from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";

export class Supplier_repo{
    private static instance:Supplier_repo;
    static getinstance():Supplier_repo{
        if(!Supplier_repo.instance){
            Supplier_repo.instance=new Supplier_repo();
        }
        return Supplier_repo.instance;
    }
    async Get_All_Suppliers():Promise<Supplier[]>{
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
    async Create_Supplier(data:{name:string,product_type:ProductType}):Promise<Supplier>{
        try{
            //check if the supplier exists first

            const exist=await prisma.supplier.findFirst({
                where:{
                  name:{
                    equals:data.name,
                    mode:'insensitive'
                  }
                }
            })
            if(exist){
            throw new ItemExists();
            }
            //create the suuplier
            const created_Suplier=await prisma.supplier.create({
                data:{
                    name:data.name,
                    product_type:data.product_type,
                   
                }
            })
            return created_Suplier
        }
        catch(error){
              if (error instanceof ItemExists) {
            throw error; // Re-throw duplicate error
        }
            logger.error('error occured while creating supplier',error as Error);
            throw new DBException('error occured while creating supplier',error as Error);
        }
    }
}
export const suplier_repo=Supplier_repo.getinstance();