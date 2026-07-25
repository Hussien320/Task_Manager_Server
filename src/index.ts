import config from './config';
import logger from './util/logger';

logger.info('Hello, world!, the secret is ', config.SECRET);
console.log('Hello, world!, the secret is ', config.SECRET);