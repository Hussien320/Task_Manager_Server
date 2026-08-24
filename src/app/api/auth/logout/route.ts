import { authService } from "@/services/AuthService";

import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){
    try{
         const userId = request.headers.get('x-user-id');

        if (!userId) {
            logger.warn('Logout attempted without user ID');
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }
        await authService.logout(userId);



         const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
        await authService.clearAuthCookies(response);
         logger.info(`User ${userId} logged out successfully`);

        return response;

    }
    catch(err){
        logger.error('Logout error:', err);
        return NextResponse.json(
            { success: false, message: 'Logout failed' },
            { status: 500 }
        );
    }

}
