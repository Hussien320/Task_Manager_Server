import { ProductType } from "@/app/generated/prisma/enums";
import { authGuard } from "@/lib/auth/guard";
import { updateAppSettingsSchema } from "@/schemaValidations/schema";
import { appSettingService } from "@/services/AppSettingService";
import {  ROLE } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { handleRouteError } from "@/utils/handleRouteError";
import { NextRequest } from "next/server";

    export async function PUT(request: NextRequest){
        try{
            const autherror=authGuard(request,{requireRole:ROLE.ADMIN});
            if(autherror) return autherror;
             let body;
                try {
                  body = await request.json();
                } catch {
                  throw new BadRequestException("Bad request: request body must be valid JSON");
                }
                const parsed=updateAppSettingsSchema.safeParse(body);
                if(!parsed.success){
                    throw new BadRequestException("Invalid request body", {
                        errors: parsed.error.issues.map((issue) => ({
                            path: issue.path,
                            message: issue.message,
                        })),
                    });
                }
                const id= request.headers.get("x-user-id");
                if(!id){
                    throw new BadRequestException("Missing x-user-id header");
                }
                const {data}=parsed;
                await appSettingService.updateSettingValue(data.category as ProductType,data.value,id);
                return new Response(JSON.stringify({
                    success:true,
                    message:"App setting updated successfully"
                }),{
                    status:200});
                   

        }
        catch(error){
            return handleRouteError(error, {
                operation: 'Update App Setting',
                permissionMessage: 'You do not have permission to update app settings',
             
            });
        }

    }

