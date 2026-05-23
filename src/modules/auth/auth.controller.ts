import type { Request, Response } from "express";
import { authService } from "./auth.service";
import sendResponse from "../../utility/sendResponse";

// POST /api/auth/signup
const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    // Basic required-field validation
    if (!name || !email || !password) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "name, email, and password are required",
      });
      return;
    }

    const user = await authService.signupUser({
      name,
      email,
      password,
      role: role as never,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: user,
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

// POST /api / auth / login;
const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "email and password are required",
      });
      return;
    }

    const result = await authService.loginUser({ email, password });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result,
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

export const authController = { signup, login };