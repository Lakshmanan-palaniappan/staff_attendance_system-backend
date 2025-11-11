import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { poolPromise } from "./db.js";

import authRoutes from "./routes/authRoute.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/admin", adminRoutes);
app.use("/staff", staffRoutes);

const PORT = process.env.PORT || 3030;
server.listen(PORT, async () => {
  await poolPromise;
  console.log(`Server running on port ${PORT}`);
});
