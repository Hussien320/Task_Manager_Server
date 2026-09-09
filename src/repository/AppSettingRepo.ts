import { AppSetting } from "@/app/generated/prisma/browser";
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
async updateSettingValue(category: ProductType, value: number,userid:string): Promise<void> {
    try {
        const key = `threshold_${category}`;
        await prisma.appSetting.upsert({
            where: { setting_key: key },
            update: { setting_value: value.toString() },
            create: { setting_key: key, setting_value: value.toString() ,
                updated_by:userid,
                updatedAt: new Date()
            }

            
        });
        logger.debug(`Updated threshold for ${category} to ${value}`);
    }
    catch (error) {
        logger.error('Error while updating the setting value', error);
        throw new DBException('Error while updating the setting value', error as Error);
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
async getAll():Promise<AppSetting[]>{
    try{
        const settings=await prisma.appSetting.findMany();
        logger.debug(`Retrieved all app settings: ${JSON.stringify(settings)}`);
        return settings;
    }
    catch(error){
        logger.error('Error while retrieving all app settings', error);
        throw new DBException('Error while retrieving all app settings', error as Error);
    }
}

}
export const appsettingRepo=AppSettingRepo.getInstance();