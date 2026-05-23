import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/index.js";
import type { IJwtPayload, TRole } from "../types/index.js";

/**
 * auth(...roles)
 * ─ Verifies the JWT in Authorization header.
 * ─ Populates req.user with the decoded payload.
 * ─ Optionally restricts access to the specified roles.
 *
 * Header format:  Authorization: <token>   (no "Bearer" prefix per spec)
 */
const auth = (...roles: TRole[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = req.headers.authorization;

      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized: No token provided",
        });
        return;
      }

      let decoded: IJwtPayload;
      try {
        decoded = jwt.verify(token, config.jwt_secret) as IJwtPayload;
      } catch {
        res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid or expired token",
        });
        return;
      }

      // Role guard — skip if no roles specified (any authenticated user passes)
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        res.status(403).json({
          success: false,
          message:
            "Forbidden: You do not have permission to perform this action",
        });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
