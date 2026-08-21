import { ProductType, Supplier } from "@/app/generated/prisma/client";

export interface SupplierResponse{
      id: string;
    name: string;
    product_type: string;
    is_active: boolean;
}
export interface SupplierListResponse{
 
    suppliers: SupplierResponse[];
    total: number;
}


export  function toSupplierResponse(supplier: Supplier): SupplierResponse {
        return {
            id: supplier.id,
            name: supplier.name,
            product_type: supplier.product_type,
            is_active: supplier.is_active,
          
        };
    }
    export function  toSupplierResponseArray(suppliers: Supplier[]): SupplierResponse[] {
        return suppliers.map(supplier => toSupplierResponse(supplier));
    }
    export function toType(type: string): ProductType {
      const roleMap: Record<string, ProductType> = {
        'PLASTIC': ProductType.PLASTIC,
        'CLEANING': ProductType.CLEANING,
        'VEGTABLE':ProductType.VEGTABLE
      };
       const mappedType = roleMap[type.toLowerCase()];
  if (!mappedType) {
    throw new Error(`Invalid role: ${type}`);
  }
  return mappedType;
      
    }
      