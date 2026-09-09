import { NextRequest, NextResponse } from "next/server";
import { appSettingService } from "@/services/AppSettingService";
import { handleRouteError } from "@/utils/handleRouteError";
import { authGuard } from "@/lib/auth/guard";
import { ROLE } from "@/types/Roles";
export async function GET(request: NextRequest) {
    try {
        const authError = authGuard(request, { requireRole: ROLE.ADMIN });
        if (authError) return authError;
        const settings = await appSettingService.getAllSettings();
        return NextResponse.json({
            success: true,
            data: settings,
            meta: {
                total: settings.total
            }
        },
    {status: 200},
    )
    } catch (error) {
        return handleRouteError(error, {
            operation: 'Get All App Settings',
            permissionMessage: 'You do not have permission to view app settings',
        });
    }
}