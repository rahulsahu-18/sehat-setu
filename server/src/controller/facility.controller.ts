import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken";
import { Facility, FacilityType } from "../models/facility.model";
import { User, UserRole } from "../models/user.model";

export const getFacilities = async (_req: Request, res: Response) => {
  try {
    const facilities = await Facility.find()
      .select("name type location")
      .sort({ name: 1 });

    return res.status(200).json({ success: true, data: facilities });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load facilities" });
  }
};

export const registerFacility = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { facility, admin } = req.body;

    if (!facility?.name || !facility?.type || !facility?.location) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Facility name, type and location are required",
      });
    }

    if (!Object.values(FacilityType).includes(facility.type)) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid facility type",
      });
    }

    if (!admin?.name || !admin?.email || !admin?.phoneNo || !admin?.password) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Admin name, email, phone and password are required",
      });
    }

    if (admin.password.length < 8) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingEmail = await User.findOne({
      email: admin.email.toLowerCase(),
    }).session(session);

    if (existingEmail) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingPhone = await User.findOne({
      phoneNo: admin.phoneNo,
    }).session(session);

    if (existingPhone) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists",
      });
    }

    const createdFacility = await Facility.create(
      [
        {
          name: facility.name,
          type: facility.type,
          location: facility.location,
        },
      ],
      {
        session,
      },
    );

    const newFacility = createdFacility[0];

    if (!newFacility) {
      throw new Error("Failed to create facility");
    }

    const hashedPassword = await bcrypt.hash(admin.password, 12);

    const createdUsers = await User.create(
      [
        {
          name: admin.name,

          email: admin.email.toLowerCase(),

          phoneNo: admin.phoneNo,

          password: hashedPassword,

          role: UserRole.FACILITY_ADMIN,

          facilityId: newFacility._id,
        },
      ],
      {
        session,
      },
    );

    const adminUser = createdUsers[0];

    if (!adminUser) {
      throw new Error("Failed to create facility administrator");
    }

    await session.commitTransaction();

    const token = generateToken({
      userId: adminUser._id.toString(),

      role: adminUser.role,

      facilityId: newFacility._id.toString(),
    });

    return res.status(201).json({
      success: true,

      message: "Facility registered successfully",

      data: {
        facility: {
          id: newFacility._id,
          name: newFacility.name,
          type: newFacility.type,
          location: newFacility.location,
        },

        admin: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phoneNo: adminUser.phoneNo,
          role: adminUser.role,
          facilityId: adminUser.facilityId,
        },

        token,
      },
    });
  } catch {
    await session.abortTransaction();

    return res.status(500).json({
      success: false,
      message: "Failed to register facility",
    });
  } finally {
    session.endSession();
  }
};

export const loginFacilityAdmin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required",
      });
    }

    const isEmail = identifier.includes("@");

    const adminUser = isEmail
      ? await User.findOne({
          email: identifier.toLowerCase(),

          role: UserRole.FACILITY_ADMIN,
        }).populate("facilityId")
      : await User.findOne({
          phoneNo: identifier,

          role: UserRole.FACILITY_ADMIN,
        }).populate("facilityId");

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid facility administrator credentials",
      });
    }

    if (!adminUser.password) {
      return res.status(401).json({
        success: false,
        message: "This account does not use password login",
      });
    }

    const passwordMatch = await bcrypt.compare(password, adminUser.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid facility administrator credentials",
      });
    }

    if (!adminUser.facilityId) {
      return res.status(500).json({
        success: false,
        message: "Administrator is not linked to a facility",
      });
    }

    const facilityId = String(
      (adminUser.facilityId as any)._id ?? adminUser.facilityId,
    );

    const token = generateToken({
      userId: adminUser._id.toString(),

      role: adminUser.role,

      facilityId,
    });

    return res.status(200).json({
      success: true,
      message: "Facility admin login successful",

      data: {
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phoneNo: adminUser.phoneNo,
          role: adminUser.role,
          facilityId,
        },

        facility:
          typeof adminUser.facilityId === "object"
            ? adminUser.facilityId
            : null,

        token,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to login facility administrator",
    });
  }
};
