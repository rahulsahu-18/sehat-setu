import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { patientModel } from "../models/patient.model";

export const addpatient = async (req: Request, res: Response) => {
  const { name, gender, phoneNo, language } = req.body;
  try {
    if (!name || !gender || !phoneNo || !language)
      return res
        .status(400)
        .json({ success: false, message: "feilds are required" });

    let patient = await patientModel.findOneAndUpdate(
      {phoneNo},
      { name, gender, language },
      { new: true },
    );

    let patientId;

    if (patient) {
      patientId = patient._id;
    } else {
      patient = await patientModel.create({ phoneNo, name, language, gender });
      patientId = patient._id;
    }

    const token = jwt.sign({ patientId }, process.env.JWT_SECRET!, {
      expiresIn: "2d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      sameSite: "lax",
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "error while add user" });
  }
};
