import { productservice } from './ProductService';
import { userRepo } from '@/repository/UserRepo';
import { emailService } from '@/lib/EmailService';
import logger from '@/utils/logger';
import { ItemNotFoundException } from '@/utils/exceptions/RepoException';
import { User } from '@/app/generated/prisma/browser';

export class ExpiryAlertScheduler {
    
    async runDailyExpiryAlert(): Promise<{
        success: boolean;
        message: string;
        productsFound?: number;
        managersNotified?: number;
    }> {
        logger.info('🕐 Starting daily expiry alert check...');

        try {
            // 1. Get all expiring products (already ExpiringProduct[] type)
            const expiringProducts = await productservice.GetExpiringProducts();
            
            if (!expiringProducts || expiringProducts.length === 0) {
                logger.info('✅ No products expiring soon');
                return {
                    success: true,
                    message: 'No products expiring soon',
                    productsFound: 0
                };
            }

            logger.info(`📦 Found ${expiringProducts.length} products expiring soon`);

            // 2. Get all manager emails
            const managers = await userRepo.getadminUser();
            if(!managers){
                logger.warn('⚠️ No managers found');
                throw new ItemNotFoundException('No managers found');
            }
            const managerEmails = managers.map(manager => manager.email);

            if (!managerEmails || managerEmails.length === 0) {
                logger.warn('⚠️ No manager emails found');
                return {
                    success: false,
                    message: 'No manager emails found',
                    productsFound: expiringProducts.length
                };
            }

            // 3. Send consolidated email to each manager
            // ✅ Pass expiringProducts directly - it already has all required fields!
            for (const email of managerEmails) {
                await emailService.sendExpiryAlert(email, expiringProducts);
            }

            logger.info(`📧 Expiry alert sent to ${managerEmails.length} manager(s)`);

            return {
                success: true,
                message: `Expiry alert sent to ${managerEmails.length} manager(s)`,
                productsFound: expiringProducts.length,
                managersNotified: managerEmails.length
            };

        } catch (error) {
            logger.error('❌ Daily expiry alert job failed', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}

export const expiryAlertScheduler = new ExpiryAlertScheduler();