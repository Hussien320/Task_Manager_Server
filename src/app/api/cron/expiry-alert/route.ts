// src/app/api/cron/expiry-alert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { expiryAlertScheduler } from "@/services/ExpiryAlertScheduler";
import logger from "@/utils/logger";

export async function GET(request: NextRequest) {
    try {
        // Security: Only allow requests with valid cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret) {
            if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
                logger.warn('⚠️ Unauthorized cron attempt');
                return NextResponse.json(
                    { error: 'Unauthorized - Invalid cron secret' },
                    { status: 401 }
                );
            }
        }

        // Run the expiry alert job (no user authentication needed)
        logger.info('⏰ Running expiry alert cron job...');
        const result = await expiryAlertScheduler.runDailyExpiryAlert();
        
        return NextResponse.json({
            success: result.success,
            message: result.message,
            data: {
                productsFound: result.productsFound || 0,
                managersNotified: result.managersNotified || 0,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('❌ Cron job failed:', error);
        return NextResponse.json(
            { 
                error: 'Cron job failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}