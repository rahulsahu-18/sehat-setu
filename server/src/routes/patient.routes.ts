import express, { Router } from "express";
import { addpatient } from "../controller/patient.controller";

const patientRouter:Router = express.Router();

patientRouter.post('/add-patient',addpatient);

export default patientRouter;