import express from "express";
import { listPendingRequests, approveRequest, listAllStaff } from "../controllers/adminController.js";
const router = express.Router();
router.get("/requests", listPendingRequests);
router.post("/approve", approveRequest);
router.get("/staffs", listAllStaff);
export default router;
