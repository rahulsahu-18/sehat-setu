import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { User, UserRole } from "../models/user.model";
import { generateToken } from "../utils/generateToken";

export const registerPatient = async (req: Request, res: Response) => {
  try {
    const { name, phoneNo, email, password, gender, language } = req.body;

    if (!name || !phoneNo || !gender || !language) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, gender and language are required",
      });
    }

    if (!["male", "female", "other"].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender",
      });
    }

    if (!["english", "hindi", "odia"].includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Invalid language",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingPhone = await User.findOne({
      phoneNo,
    });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists",
      });
    }

    if (email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const patient = new User({
      name,
      phoneNo,
      ...(email ? { email: email.toLowerCase() } : {}),
      gender,

      password: hashedPassword,

      role: UserRole.PATIENT,

      language,
    });

    patient.patientId = `PAT-${patient._id.toString().slice(-8).toUpperCase()}`;

    await patient.save();

    const token = generateToken({
      userId: patient._id.toString(),
      role: patient.role,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",

      data: {
        user: {
          id: patient._id,
          name: patient.name,
          phoneNo: patient.phoneNo,
          email: patient.email,
          role: patient.role,
          patientId: patient.patientId,
          gender: patient.gender,
          language: patient.language,
        },

        token,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to register patient",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required",
      });
    }

    const isEmail = identifier.includes("@");

    const user = isEmail
      ? await User.findOne({
          email: identifier.toLowerCase(),
          role: UserRole.PATIENT,
        })
      : await User.findOne({
          phoneNo: identifier,
          role: UserRole.PATIENT,
        });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
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
        message: "Invalid credentials",
      });
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      ...(user.facilityId ? { facilityId: user.facilityId.toString() } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        user: {
          id: user._id,
          name: user.name,
          phoneNo: user.phoneNo,
          email: user.email,
          role: user.role,
          patientId: user.patientId,
          gender: user.gender,
          language: user.language,
          facilityId: user.facilityId,
        },

        token,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};
