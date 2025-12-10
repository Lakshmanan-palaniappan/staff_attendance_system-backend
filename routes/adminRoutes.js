import express from "express";
import { adminRegister, adminLogin } from "../controllers/adminAuthController.js";
import { 
  listPendingRequests, 
  approveRequest,
  listAllStaff,
  getStaffAttendance,
  getTodayAttendanceForAll,
  getCheckinCheckoutPairs,
  getTodayAttendanceStaffWise,
  createAppVersion,
  getAppConfig,
  updateAllowedRadius
  
} from "../controllers/adminController.js";

const router = express.Router();

// Admin login system
router.post("/register", adminRegister);
router.post("/login", adminLogin);

// Login request approval
router.get("/requests", listPendingRequests);
router.post("/approve", approveRequest);

// Staff Management
router.get("/staffs", listAllStaff);

// Attendance
router.get("/attendance/:staffId", getStaffAttendance);
router.get("/attendance/today/all", getTodayAttendanceForAll);
router.get("/attendance/pairs/:staffId", getCheckinCheckoutPairs);
router.get("/attendance/today/staffwise", getTodayAttendanceStaffWise);
router.post("/app-version", createAppVersion); 
// example routes (adjust paths to your style)
router.get("/admin/app-config", getAppConfig);
router.put("/admin/app-config/radius", updateAllowedRadius);
// or POST if you prefer



export default router;
