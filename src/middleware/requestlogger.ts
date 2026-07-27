import { NextFunction ,Request,Response} from "express";
import logger from "../util/logger";

const requestLogger = (req:Request, res:Response, next:NextFunction) => {
 res.on("finish", () => {
    const status = res.statusCode;
    const { method, url } = req;

    let level: "info" | "warn" | "error" = "info";

    if (status >= 500) {
      level = "error";
    } else if (status >= 400) {
      level = "warn";
    }

    logger.log({
      level,
      message: `${method} ${url} ${status}`,
    });
  });

  next();
}
export default requestLogger;