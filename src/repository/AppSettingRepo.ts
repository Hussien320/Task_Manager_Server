import { ProductType } from "@/app/generated/prisma/enums";
import prisma from "@/lib/db";
import { DBException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";

export class AppSettingRepo{
    private static instance :AppSettingRepo;
    static getInstance():AppSettingRepo{
        if(!AppSettingRepo.instance){
            AppSettingRepo.instance=new AppSettingRepo();
        }
        return AppSettingRepo.instance;
    }
   async getSettingvalue(category: ProductType): Promise<number> {
    try {
        const key = `threshold_${category}`;
        const setting = await prisma.appSetting.findUnique({
            where: {
                setting_key: key
            }
        });

        if (setting) {
            const value = parseInt(setting.setting_value, 10);
            logger.debug(`Threshold for ${category}: ${value} (from AppSettings)`);
            return value;
        }

        // ✅ Return default value if not found
        const defaultThresholds: Record<ProductType, number> = {
            [ProductType.VEGTABLE]: 10,
            [ProductType.PLASTIC]: 20,
            [ProductType.CLEANING]: 5,
        };

        const defaultValue = defaultThresholds[category] || 10;
        logger.debug(`Threshold for ${category}: ${defaultValue} (using default)`);
        return defaultValue;

    } catch (error) {
        logger.error('Error while getting the setting value', error);
        throw new DBException('Error while getting the setting value', error as Error);
    }
}
async getExpiryThreshold(): Promise<number> {
    try{
        const expirtySetting = await prisma.appSetting.findUnique({
            where: {
                setting_key: 'expiry_warning_days'
            }
        });
        logger.debug(`Expiry threshold: ${expirtySetting ? expirtySetting.setting_value : 'not set'} (from AppSettings)`);
        return expirtySetting ? parseInt(expirtySetting.setting_value, 10) : 7; // Default to 7 days if not set
        

    }
    catch(error){
        logger.error('Error while getting the expiry threshold', error);
        throw new DBException('Error while getting the expiry threshold', error as Error);
    }
}

}
export const appsettingRepo=AppSettingRepo.getInstance();