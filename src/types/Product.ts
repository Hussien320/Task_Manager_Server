import { Product } from "@/app/generated/prisma/client";
import { ProductType } from "@/app/generated/prisma/enums";

export interface ProductResponse{
id:string,
name:string,
quantity:number,
price:number,
category:ProductType,
expiry_date:Date | null,
low_stock_threshold:number,
supplier_id:string
suppliername?:string


}
export interface ProductListResponse{
 
    products: ProductResponse[];
    total: number;
}
export interface ProductHistoryResponse {
    id: string;
    name: string;
    category: ProductType;
    quantity: number;
    low_stock_threshold: number;
    supplier_id: string;
    supplier_name: string;  // ← Flattened from supplier.name
    inventoryLogs: {
        transaction_type: string;
        quantity_changed: number;
        unit_price_at_time: number | null;
        logged_at: Date;
    }[];
}
 export interface ExpiringProduct {
  id: string;
  name: string;
  quantity: number;
  expiry_date: Date;
  daysUntilExpiry: number;
}
export function toProductResponse(product:Product,suppliername?:string):ProductResponse{
    return{
        id:product.id,
        name:product.name,
        quantity:product.quantity,
        price:Number(product.price),
        category:product.category,
        expiry_date:product.expiry_date,
        low_stock_threshold:product.low_stock_threshold,
        supplier_id:product.supplier_id,
        suppliername:suppliername


    }
}
 export function  toProductResponseArray(products: Product[],suppliername?:string): ProductResponse[] {
        return products.map(product => toProductResponse(product,suppliername));
    }
    export function toExipiringProductResponseArray(products: Product[]): ExpiringProduct[] {
        const today = new Date();
        return products.map(product => {
            const expiryDate = product.expiry_date!;
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
            return {
                id: product.id,
                name: product.name,
                quantity: product.quantity,
                expiry_date: expiryDate,
                daysUntilExpiry
            };
        });
    }
        
