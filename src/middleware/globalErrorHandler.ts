import type { NextFunction, Request, Response } from "express";

/**
 * Centralized error-handling middleware.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 */
const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  console.error("💥 Unhandled error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message ?? "Internal Server Error",
    errors: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default globalErrorHandler;
