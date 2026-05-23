import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { authRoute } from "./modules/auth/auth.route";
import { issuesRoute } from "./issues/issues.route";
import logger from "./middleware/logger";


const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "DevPulse API is running 🚀",
    version: "1.0.0",
  });
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issuesRoute);

export default app;
