import { NextResponse } from 'next/server';
import { startDevCron } from '@/services/CronScheduler';
import logger from '@/utils/logger';

let initialized = false;

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'This endpoint is only available in development' },
            { status: 403 }
        );
    }

    if (initialized) {
        return NextResponse.json({
            success: true,
            message: 'Cron scheduler already running',
            status: 'active',
            schedule: 'Every 2 minutes'
        });
    }

    try {
        startDevCron();
        initialized = true;
        
        return NextResponse.json({
            success: true,
            message: 'Cron scheduler started successfully!',
            status: 'running',
            schedule: 'Every 2 minutes',
            note: 'The job will run automatically every 2 minutes. Check your terminal logs.'
        });
    } catch (error) {
        logger.error('Failed to start cron scheduler:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to start cron scheduler',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}