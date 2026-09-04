import cron from 'node-cron';
import { expiryAlertScheduler } from './ExpiryAlertScheduler';
import logger from '@/utils/logger';

let isInitialized = false;

export function startDevCron() {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
        logger.info('⏭️ Skipping cron initialization (not in development)');
        return;
    }

    if (isInitialized) {
        logger.warn('⚠️ Cron scheduler already initialized');
        return;
    }

    logger.info('🔄 Starting development cron scheduler...');

    // Run every 2 minutes for testing
    cron.schedule('0 7 * * *', async () => {
        logger.info('⏰ Running scheduled expiry alert (dev mode)...');
        try {
            const result = await expiryAlertScheduler.runDailyExpiryAlert();
            logger.info(`📊 Result: ${result.message}`);
        } catch (error) {
            logger.error('❌ Scheduled job failed:', error);
        }
    });

    isInitialized = true;
    logger.info('✅ Dev cron started - running every 2 minutes');

    // Run immediately on startup (optional)
    setTimeout(async () => {
        logger.info('🚀 Running initial test...');
        await expiryAlertScheduler.runDailyExpiryAlert();
    }, 3000);
}