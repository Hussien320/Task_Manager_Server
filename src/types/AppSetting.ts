import { AppSetting } from "@/app/generated/prisma/client";
export interface AppSettingResponse {
    setting_key: string;
    setting_value: string;
}
export interface AppSettingListResponse {
    settings: AppSettingResponse[];
    total: number;
}
 export  function toAppSettingResponseArray(settings: AppSetting[]): AppSettingResponse[] {
    return settings.map(setting => ({
        setting_key: setting.setting_key,
        setting_value: setting.setting_value
    }));
}