import { Product, ProductType } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { DBException, ItemExists, ItemNotFoundException } from "@/utils/exceptions/RepoException";
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
    async getProductByName(name:string):Promise<Product | null>{
        try{
            const targetproduct=await prisma.product.findFirst({
                where:{
                    name:{
                        equals:name,
                        mode:'insensitive'
                    }
                }
            })
            return targetproduct


        }
        catch(error){
            logger.error('error while retreiving the product');
            throw new DBException('Error while retrieving product',error as Error);

        }
    }
    
     async updateProduct(
        id: string,
        data: {
            name?: string;
            category?: ProductType;
            quantity?: number;
            price?: number;
            expiry_date?: Date | null;
            low_stock_threshold?: number;
            supplier_id?: string;
        }
    ): Promise<Product> {
        try {
            // ✅ Check for duplicate name (excluding self)
            if (data.name !== undefined) {
                const existing = await prisma.product.findFirst({
                    where: {
                        name: {
                            equals: data.name,
                            mode: 'insensitive'
                        },
                        id: { not: id }
                    }
                });
                if (existing) {
                    throw new ItemExists();
                }
            }

            // ✅ Only update provided fields
            const updatedProduct = await prisma.product.update({
                where: { id: id },
                data: {
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.category !== undefined && { category: data.category }),
                    ...(data.quantity !== undefined && { quantity: data.quantity }),
                    ...(data.price !== undefined && { price: data.price }),
                    ...(data.expiry_date !== undefined && { expiry_date: data.expiry_date }),
                    ...(data.low_stock_threshold !== undefined && { low_stock_threshold: data.low_stock_threshold }),
                    ...(data.supplier_id !== undefined && { supplier_id: data.supplier_id }),
                }
            });

            logger.info(`Product updated: ${updatedProduct.name} (${updatedProduct.id})`);
            return updatedProduct;

        } catch (error) {
            if (error instanceof ItemExists) {
                throw error;
            }
            if ((error as { code?: string }).code === 'P2025') {
                logger.warn(`Product ${id} not found while updating`);
                throw new ItemNotFoundException('Product not found');
            }
            logger.error('Error while updating product', error as Error);
            throw new DBException('Error while updating product', error as Error);
        }
    }
}
export const productRepo=ProductRepo.getinstance();