import { Router } from "express";

import auth from "../../middleware/auth.js";
import { issuesController } from "./issues.controller.js";
import { USER_ROLE } from "../../types/index.js";

const router = Router();

// Public
router.get("/", issuesController.getAllIssues);
router.get("/:id", issuesController.getIssueById);

// Authenticated (any role)
router.post(
  "/",
  auth(USER_ROLE.contributor, USER_ROLE.maintainer),
  issuesController.createIssue,
);

// Authenticated — contributor OR maintainer
router.patch(
  "/:id",
  auth(USER_ROLE.contributor, USER_ROLE.maintainer),
  issuesController.updateIssue,
);

// Maintainer only
router.delete("/:id", auth(USER_ROLE.maintainer), issuesController.deleteIssue);

export const issuesRoute = router;
