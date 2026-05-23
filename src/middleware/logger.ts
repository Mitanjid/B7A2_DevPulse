import type { NextFunction, Request, Response } from "express";
import fs from "fs";

const logger = (req: Request, _res: Response, next: NextFunction): void => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  console.log(log.trim());
  fs.appendFile("logger.txt", log, () => {}); // fire-and-forget
  next();
};

export default logger;
