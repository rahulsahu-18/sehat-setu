import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import {
  StaffApplication,
  ApplicationStatus,
} from "../models/staffApplication.model";

import { User, UserRole } from "../models/user.model";

import { Facility } from "../models/facility.model";
import { Case, CaseStatus } from "../models/case.model";

import { generateToken } from "../utils/generateToken";

import { AuthRequest } from "../middleware/auth.middleware";

export const getStaffCases = async (req: AuthRequest, res: Response) => {
  try {
    const facilityId = req.user?.facilityId;
    const userId = req.user?.userId;
    if (!facilityId || !userId) {
      return res
        .status(403)
        .json({ success: false, message: "Facility not found" });
    }

    const cases = await Case.find({
      facilityId,
      $or: [
        { assignedStaffId: new Types.ObjectId(userId) },
        { assignedStaffId: null },
      ],
      status: {
        $in: [
          CaseStatus.NEW,
          CaseStatus.AI_PROCESSING,
          CaseStatus.WAITING_FOR_REVIEW,
          CaseStatus.WAITING_FOR_PATIENT,
          CaseStatus.FINAL_REVIEW,
          CaseStatus.ACTIVE,
          CaseStatus.FOLLOW_UP,
          CaseStatus.REFERRED,
          CaseStatus.ESCALATED,
        ],
      },
    })
      .populate("patientId", "name patientId language")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: cases });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load care queue" });
  }
};
export const applyAsStaff = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNo, password, role, facilityId } = req.body;

    if (!name || !phoneNo || !password || !role || !facilityId) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, password, role and facility are required",
      });
    }

    if (role !== UserRole.DOCTOR && role !== UserRole.NURSE) {
      return res.status(400).json({
        success: false,
        message: "Only doctor or nurse can apply",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const facility = await Facility.findById(facilityId);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ phoneNo }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone already exists",
      });
    }

    const existingApplication = await StaffApplication.findOne({
      facilityId,
      status: ApplicationStatus.PENDING,
      $or: [{ phoneNo }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending application for this facility",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const application = await StaffApplication.create({
      name,
      phoneNo,
      email: email?.toLowerCase(),
      password: hashedPassword,
      role,
      facilityId,
      status: ApplicationStatus.PENDING,
    });

    return res.status(201).json({
      success: true,
      message:
        "Application submitted successfully. Wait for facility admin approval.",
      data: {
        application: {
          id: application._id,
          name: application.name,
          role: application.role,
          facilityId: application.facilityId,
          status: application.status,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to submit staff application",
    });
  }
};

export const getStaffApplications = async (req: AuthRequest, res: Response) => {
  try {
    const facilityId = req.user?.facilityId;

    if (!facilityId) {
      return res.status(403).json({
        success: false,
        message: "Facility not found",
      });
    }

    const applications = await StaffApplication.find({
      facilityId,
    })
      .select("-password")
      .populate("facilityId", "name type location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to get applications",
    });
  }
};

export const acceptStaffApplication = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Application id is required" });
    }

    const facilityId = req.user?.facilityId;

    if (!facilityId) {
      return res.status(403).json({
        success: false,
        message: "Facility not found",
      });
    }

    const application = await StaffApplication.findOne({
      _id: id,
      facilityId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: "Application already processed",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { phoneNo: application.phoneNo },
        ...(application.email ? [{ email: application.email }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email or phone already exists",
      });
    }

    const user = await User.create({
      name: application.name,

      phoneNo: application.phoneNo,

      ...(application.email ? { email: application.email } : {}),

      password: application.password,

      role: application.role,

      facilityId: application.facilityId,
    });

    application.status = ApplicationStatus.ACCEPTED;

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Staff application accepted",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNo: user.phoneNo,
          role: user.role,
          facilityId: user.facilityId,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to accept application",
    });
  }
};
export const rejectStaffApplication = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Application id is required" });
    }

    const facilityId = req.user?.facilityId;

    if (!facilityId) {
      return res.status(403).json({
        success: false,
        message: "Facility not found",
      });
    }

    const application = await StaffApplication.findOne({
      _id: id,
      facilityId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: "Application already processed",
      });
    }

    application.status = ApplicationStatus.REJECTED;

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Staff application rejected",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to reject application",
    });
  }
};

export const loginStaff = async (req: Request, res: Response) => {
  try {
    const { identifier, password, facilityId } = req.body;

    if (!identifier || !password || !facilityId) {
      return res.status(400).json({
        success: false,
        message: "Email/phone, password and facility are required",
      });
    }

    const isEmail = identifier.includes("@");

    const user = isEmail
      ? await User.findOne({
          email: identifier.toLowerCase(),
          facilityId,
          role: {
            $in: [UserRole.DOCTOR, UserRole.NURSE],
          },
        }).populate("facilityId")
      : await User.findOne({
          phoneNo: identifier,
          facilityId,
          role: {
            $in: [UserRole.DOCTOR, UserRole.NURSE],
          },
        }).populate("facilityId");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials or facility",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account does not use password login",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials",
      });
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      facilityId: facilityId.toString(),
    });

    return res.status(200).json({
      success: true,
      message: "Staff login successful",

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNo: user.phoneNo,
          role: user.role,
          facilityId: user.facilityId,
        },

        facility: user.facilityId,

        token,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to login staff",
    });
  }
};
