import dotenv from "dotenv";
import { env } from "process";

dotenv.config({ quiet: true });
const config = {
  port: env.PORT,
  database_url: env.DATABASE_URL as string,
  jwt_secret: process.env.JWT_SECRET as string,
};

export default config;
