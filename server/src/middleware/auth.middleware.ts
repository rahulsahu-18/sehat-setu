import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { UserRole } from "../models/user.model";
import { User } from "../models/user.model";

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
  next: NextFunction,
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
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const facilityAdminOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.userId || req.user.role !== UserRole.FACILITY_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Facility administrator access required",
    });
  }
  try {
    const user = await User.findById(req.user.userId).select("role facilityId");
    if (user?.role !== UserRole.FACILITY_ADMIN || !user.facilityId) {
      return res.status(403).json({
        success: false,
        message: "Facility administrator access required",
      });
    }
    req.user.facilityId = user.facilityId.toString();
    next();
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Authorization check failed" });
  }
};

export const patientOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.userId || req.user.role !== UserRole.PATIENT) {
    return res.status(403).json({
      success: false,
      message: "Patient access required",
    });
  }
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (user?.role !== UserRole.PATIENT) {
      return res.status(403).json({
        success: false,
        message: "Patient access required",
      });
    }
    next();
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Authorization check failed" });
  }
};

export const healthcareStaffOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (
    !req.user?.userId ||
    ![UserRole.DOCTOR, UserRole.NURSE].includes(req.user.role)
  ) {
    return res
      .status(403)
      .json({ success: false, message: "Healthcare staff access required" });
  }

  try {
    const user = await User.findById(req.user.userId).select("role facilityId");
    if (
      !user?.facilityId ||
      ![UserRole.DOCTOR, UserRole.NURSE].includes(user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Healthcare staff access required",
      });
    }
    req.user.role = user.role;
    req.user.facilityId = user.facilityId.toString();
    next();
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Authorization check failed" });
  }
};
