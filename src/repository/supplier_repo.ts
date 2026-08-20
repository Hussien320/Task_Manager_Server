import { ProductType, Supplier } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { DBException } from "@/utils/exceptions/RepoException";
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
}
export const suplier_repo=Supplier_repo.getinstance();