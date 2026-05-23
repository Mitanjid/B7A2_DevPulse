import config from "./config";
import app from "./app";
import { initDB } from "./config/db";

const main = async () => {
  initDB();
  app.listen(config.port, () => {
    console.log(`server is running on ${config.port}`);
  });
};
main();
