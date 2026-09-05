import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    // Start the cron scheduler automatically in development
    if (dev) {
        try {
            const { startDevCron } = await import('./src/services/CronScheduler');
            startDevCron();
            console.log('✅ Development cron scheduler started automatically!');
        } catch (error) {
            console.error('Failed to start cron scheduler:', error);
        }
    }

    createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    }).listen(3000, () => {
        console.log('> Ready on http://localhost:3000');
        console.log('> Cron jobs running automatically in the background');
    });
}).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});