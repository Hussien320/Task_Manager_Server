import helmet from "helmet";
import config from "./config";
import logger from "./util/logger";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import requestLogger from "./middleware/requestlogger";
import router from "./routes";
const app=express();
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(requestLogger);
app.use("/", router);

app.listen(config.port, () => {
  logger.info(`Server is running on http://${config.host}:${config.port}`);
});

