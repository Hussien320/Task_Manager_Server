import { Product, ProductType } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { DBException, ItemExists } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";


export class ProductRepo{
    private static instance:ProductRepo;
    static getinstance():ProductRepo{
        if(!ProductRepo.instance){
            ProductRepo.instance=new ProductRepo();
        }
        return ProductRepo.instance;
    }
    async createProduct(data:{supplier_id:string,name:string,category:ProductType,quantity:number,price:number, expiry_date?:Date |null, low_stock_threshold:number}):Promise<Product>{
        try{
            //check if product exist first
            const existing=await prisma.product.findFirst({
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
            const createdProduct=await prisma.product.create({
                data:{
                    supplier_id:data.supplier_id,
                    name:data.name,
                    category:data.category,
                    price:data.price,
                    quantity:data.quantity,
                    expiry_date:data.expiry_date,
                    low_stock_threshold:data.low_stock_threshold

                }
            })
            logger.info(`Product created: ${createdProduct.name} (${createdProduct.id})`);
            return createdProduct;

        }
        catch(error){
            if(error instanceof ItemExists){
                throw error
            }
            logger.error('error while creating the product');
            throw new DBException('error while creating the product',error as Error);

        }
    }
}
export const productRepo=ProductRepo.getinstance();