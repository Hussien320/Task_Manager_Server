import { ProductType, TransactionType } from "@/app/generated/prisma/enums";
import { appsettingRepo } from "@/repository/AppSettingRepo";
import { inventoryRepo } from "@/repository/InventoryLogRepo";
import { productRepo } from "@/repository/ProductRepo";
import { supplierRepo } from "@/repository/SupplierRepo";
import { ProductResponse, toProductResponse } from "@/types/Product";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";



export class ProductService{
    private static isntance:ProductService;
    static getinsatnce():ProductService{
        if(!ProductService.isntance){
            ProductService.isntance=new ProductService();
        }
        return ProductService.isntance;
    }
    async createProduct(userid:string ,data:{supplier_name:string,name:string,category:ProductType,quantity:number,price:number, expiry_date?:Date}):Promise<ProductResponse>{
        try{
            //check if if category is perishabel
               let expiry_date: Date | null = null;
            if(data.category==ProductType.VEGTABLE){
                if(!data.expiry_date){
                    logger.error('expiray date is required fro perishabel products');
                    throw new BadRequestException('expiray date is required fro perishabel products')
                }
                expiry_date=data.expiry_date;
               
            } 
             else{
                    expiry_date=null;
                }
           
            //check if the supplier provided is exists and true
            const targetsupplier=await supplierRepo.getSupplierByName(data.supplier_name);
            if(!targetsupplier){
                logger.error('supplier not found');
                throw new ItemNotFoundException('supplier not found');
            }
            if(!targetsupplier.is_active){
                logger.error('supplier should be active');
                throw new BadRequestException('supplier is invalid');

            }
            //extract the thershold from the app setting
            const threshold=await appsettingRepo.getSettingvalue(data.category);
            //create the product
            const createdProduct= await productRepo.createProduct({supplier_id:targetsupplier.id,name:data.name,category:data.category,quantity:data.quantity,price:data.price,expiry_date:expiry_date,low_stock_threshold:threshold});
            const mappedResponse=    toProductResponse(createdProduct,targetsupplier.name);
            //log the addition to the inevntory log
            const quantityChanged = Number(createdProduct.quantity);
            const unitPriceAtTime = Number(createdProduct.price);
            const logged=await inventoryRepo.updateInventory({userid:userid,productid:createdProduct.id,transactiontype:TransactionType.ADDITION,quantity_changed:quantityChanged,unit_price_at_time:unitPriceAtTime});
            logger.info(`${logged.transaction_type} about ${logged.quantity_changed} ,price:${logged.unit_price_at_time} at ${logged.logged_at}`);

            return mappedResponse;
        }
        catch(error){
               if (error instanceof BadRequestException || error instanceof ItemNotFoundException) {
                throw error;
            }
            logger.error('Error creating product', error);
            throw new DBException('Error creating product', error as Error);
            
            }
        
        }
    
}

export const productservice=ProductService.getinsatnce();