import { StringValue } from "ms";
import dotenv from "dotenv";
dotenv.config();
export default{
     NODE_ENV: process.env.NODE_ENV || "production",
  is_Production: process.env.NODE_ENV === "production",
    auth:{
          jwtSecret: process.env.JWT_SECRET || "secret_90909090",
          expiration: (process.env.JWT_EXPIRATION || "15m") as StringValue,
          RefreshSecret: process.env.JWT_REFRESH_SECRET || "secret_90909090",
            refreshExpiration: (process.env.JWT_REFRESH_EXPIRATION || "7d") as StringValue,

    }
}