import { StaffModel } from "../models/staffModel.js";

export async function getStaffDetails(req, res) {
  try {
    const { staffId } = req.params;
    const { usernameOrId } = req.query;

    let staff;

    if (staffId) {
      staff = await StaffModel.getById(staffId);
    } else if (usernameOrId) {
      staff = await StaffModel.findByUsernameOrIdCard(usernameOrId);
    } else {
      return res.status(400).json({ error: "Provide staffId or usernameOrId" });
    }

    if (!staff || staff.length === 0) {
      return res.status(404).json({ error: "Staff not found" });
    }

    res.json(staff[0]);
  } catch (error) {
    console.error("Error fetching staff details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
