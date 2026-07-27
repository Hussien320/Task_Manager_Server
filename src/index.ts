import helmet from "helmet";
import config from "./config";
import express, { Request, Response, NextFunction } from "express";
import logger from "./util/logger";

import bodyParser from "body-parser";
import cors from "cors";
import requestLogger from "./middleware/requestlogger";
import router from "./routes";
import { ApiException } from "./util/exceptions/ApiException";
const app=express();
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(requestLogger);
app.use("/", router);
app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ApiException) {
        const apiExeption = err as ApiException;
        logger.error("API Exception of status %d: %s", apiExeption.status, err.message);
        res.status(apiExeption.status).json({ error: err.message });
    } else {
        logger.error("Unhandled Error: %s", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.listen(config.port, () => {
  logger.info(`Server is running on http://${config.host}:${config.port}`);
});

