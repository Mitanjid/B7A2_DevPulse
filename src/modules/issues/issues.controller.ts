import type { Request, Response } from "express";

import { issuesService } from "./issues.service.js";
import sendResponse from "../../utility/sendResponse.js";

import type { TIssueType } from "../../types/index.js";

// POST /api/issues
const createIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, type } = req.body as {
      title?: string;
      description?: string;
      type?: string;
    };

    // reporter_id comes from the verified JWT, not the request body
    const reporter_id = req.user!.id;

    const issue = await issuesService.createIssue({
      title: title ?? "",
      description: description ?? "",
      type: type as never,
      reporter_id,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: issue,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    sendResponse(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message,
    });
  }
};

// GET /api/issues
const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sort, type, status } = req.query as {
      sort?: string;
      type?: string;
      status?: string;
    };

    const issues = await issuesService.getAllIssues({
      sort: sort === "oldest" ? "oldest" : "newest",
      type: type as never,
      status: status as never,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrieved successfully",
      data: issues,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    sendResponse(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message,
    });
  }
};

// GET /api/issues/:id
const getIssueById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id",
      });
      return;
    }

    const issue = await issuesService.getIssueById(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issue retrieved successfully",
      data: issue,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    sendResponse(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message,
    });
  }
};

// PATCH /api/issues/:id
const updateIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id",
      });
      return;
    }

    const { title, description, type } = req.body as {
      title?: string;
      description?: string;
      type?: string;
    };

    const issue = await issuesService.updateIssue(
      id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type: type as TIssueType }),
      },
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issue updated successfully",
      data: issue,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    sendResponse(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message,
    });
  }
};

// DELETE /api/issues/:id
const deleteIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id ?? "0"), 10);
    if (isNaN(id)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid issue id",
      });
      return;
    }

    await issuesService.deleteIssue(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    sendResponse(res, {
      statusCode: e.statusCode ?? 500,
      success: false,
      message: e.message,
    });
  }
};

export const issuesController = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
};
