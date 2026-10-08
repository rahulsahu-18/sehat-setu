import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

import { UserRole } from "../models/user.model";

interface JwtPayload {
  userId: string;
  role: UserRole;
  facilityId?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const facilityAdminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (
    !req.user ||
    req.user.role !== UserRole.FACILITY_ADMIN
  ) {
    return res.status(403).json({
      success: false,
      message: "Facility admin access required",
    });
  }

  if (!req.user.facilityId) {
    return res.status(403).json({
      success: false,
      message: "Admin is not linked to a facility",
    });
  }

  next();
};