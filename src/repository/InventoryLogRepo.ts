import {InventoryLog, TransactionType} from "@/app/generated/prisma/client"
import prisma from "@/lib/db";
import { DBException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";
export class InventoryLogRepo{
    private static instance :InventoryLogRepo;
    static getInstance():InventoryLogRepo{
        if(!InventoryLogRepo.instance){
            InventoryLogRepo.instance=new InventoryLogRepo();
        }
        return InventoryLogRepo.instance;
    }
    async updateInventory(data:{userid:string,productid:string,transactiontype:TransactionType,quantity_changed:number, unit_price_at_time :number}):Promise<InventoryLog>{
        try{
            const inventorylog=await prisma.inventoryLog.create({
                data:{
                    user_id:data.userid,
                    product_id:data.productid,
                    transaction_type:data.transactiontype,
                    quantity_changed:data.quantity_changed,
                    unit_price_at_time:data.unit_price_at_time


                }
                
            });
            return inventorylog

        }
        catch(error){
            logger.error('error while creating the log');
            throw new DBException('error while creating the log',error as Error);
        }
    }
}
export const inventoryRepo=InventoryLogRepo.getInstance();