import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.join(__dirname, '../../.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  SECRET: process.env.SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development', // Checks if the environment type (e.g., 'production' or 'development') is set; if not, it uses 'development' as default.
logDir: 'logs'
};