
import { suplier_repo } from "@/repository/supplier_repo";
import { SupplierListResponse, toSupplierResponseArray } from "@/types/Supplier";

export class Supplier_Service{
    private static instance:Supplier_Service
    static getinstance():Supplier_Service{
        if(!Supplier_Service.instance){
            Supplier_Service.instance=new Supplier_Service();
        }
        return Supplier_Service.instance;
    }
    async Get_All_Suppliers():Promise<SupplierListResponse>{
        const suppliers=await suplier_repo.Get_All_Suppliers();

        const mapped_response= toSupplierResponseArray(suppliers);
        return {
            suppliers:mapped_response,
            total:mapped_response.length
        }
    }
}
export const supplier_service=Supplier_Service.getinstance();