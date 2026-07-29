import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.join(__dirname, '../../.env') });

export default {
 
  SECRET: process.env.SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development', // Checks if the environment type (e.g., 'production' or 'development') is set; if not, it uses 'development' as default.
logDir: 'logs',
port: process.env.PORT ? parseInt(process.env.PORT) : 3000, // Sets the server port from the environment variable or defaults to 3000.
host: process.env.HOST || 'localhost' // Sets the server host from the environment variable or defaults to 'localhost'.
};