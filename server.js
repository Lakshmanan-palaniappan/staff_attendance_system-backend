import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoute.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);

app.get("/", (req, res) => res.send("Staff Attendance API Running"));



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
