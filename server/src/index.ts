import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./utils/db.config";
import patientRouter from "./routes/patient.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Server is running");
});
app.use('/api/v1/patient',patientRouter);
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await connectDB();
  console.log(`Server running on http://localhost:${PORT}`);
});