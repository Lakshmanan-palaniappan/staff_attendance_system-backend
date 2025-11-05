import bcrypt from "bcrypt";
import { StaffModel } from "../models/staffModel.js";

export async function registerStaff(req, res) {
  try {
    const { name, username, password, idCardNumber } = req.body;

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedIdCard = idCardNumber.trim();

    const existing = await StaffModel.findByUsernameOrIdCardExists(trimmedUsername, trimmedIdCard);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username or ID Card already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(trimmedPassword, salt);

    await StaffModel.create({
      name: trimmedName,
      username: trimmedUsername,
      passwordHash,
      idCardNumber: trimmedIdCard
    });

    res.json({ message: "Staff registered successfully" });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function loginStaff(req, res) {
  try {
    let { usernameOrId, password } = req.body;
    usernameOrId = usernameOrId.trim();
    password = password.trim();

    console.log("DEBUG: login attempt for", usernameOrId);

    const staffList = await StaffModel.findByUsernameOrIdCard(usernameOrId);

    if (!staffList || staffList.length === 0) {
      console.log("DEBUG: staffList empty");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const staff = staffList[0];
    const storedHash = staff.PasswordHash || staff.passwordhash;
    if (!storedHash) {
      return res.status(500).json({ error: "Password not set for user" });
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
      console.log("DEBUG: password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("DEBUG: login success for staffId", staff.StaffId);

    res.json({
      message: "Login successful",
      staffId: staff.StaffId,
      name: staff.Name,
      idCardNumber: staff.IdCardNumber,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
