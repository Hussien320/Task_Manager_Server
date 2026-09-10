import { ProductType } from "@/app/generated/prisma/browser";
import { appsettingRepo } from "@/repository/AppSettingRepo";
import logger from "@/utils/logger";
import { AppSettingListResponse, toAppSettingResponseArray} from "@/types/AppSetting";

export class AppSettingService{
    private static instance: AppSettingService
    static getInstance(): AppSettingService {
        if(!AppSettingService.instance){
            AppSettingService.instance=new AppSettingService();
        }
        return AppSettingService.instance;
    
    }
    async gettingExpiryThreshold(): Promise<number> {
     
            const threshold = await appsettingRepo.getExpiryThreshold();
            if(threshold < 0){
                logger.warn(`Expiry threshold is negative (${threshold}). Using default value of 7.`);
                return 7; // Default to 7 days if the value is negative
            }
            return threshold;
       
}
async getAllSettings(): Promise<AppSettingListResponse> {
    const settings = await appsettingRepo.getAll();
    const settingResponses = await toAppSettingResponseArray(settings);
    return {
        settings: settingResponses,
        total: settingResponses.length
    };
}
async updateSettingValue(category: ProductType, value: number, userid: string): Promise<void> {
    await appsettingRepo.updateSettingValue(category, value, userid);
}
}
export const appSettingService=AppSettingService.getInstance();