import bcrypt from "bcrypt";
import { StaffModel } from "../models/staffModel.js";
import { LoginRequestModel } from "../models/loginRequestModel.js";
import { io } from "../server.js";

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

// export async function loginStaff(req, res) {
//   try {
//     let { usernameOrId, password } = req.body;
//     usernameOrId = usernameOrId.trim();
//     password = password.trim();

//     console.log("DEBUG: login attempt for", usernameOrId);

//     const staffList = await StaffModel.findByUsernameOrIdCard(usernameOrId);

//     if (!staffList || staffList.length === 0) {
//       console.log("DEBUG: staffList empty");
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     const staff = staffList[0];
//     const storedHash = staff.PasswordHash || staff.passwordhash;
//     if (!storedHash) {
//       return res.status(500).json({ error: "Password not set for user" });
//     }

//     const isMatch = await bcrypt.compare(password, storedHash);
//     if (!isMatch) {
//       console.log("DEBUG: password mismatch");
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     console.log("DEBUG: login success for staffId", staff.StaffId);

//     res.json({
//       message: "Login successful",
//       staffId: staff.StaffId,
//       name: staff.Name,
//       idCardNumber: staff.IdCardNumber,
//     });

//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

export async function loginRequest(req, res) {
  const { usernameOrId, password } = req.body;
  try {
    const staffList = await StaffModel.findByUsernameOrIdCard(usernameOrId);
    if (!staffList.length) return res.status(404).json({ error: "User not found" });

    const staff = staffList[0];
    const valid = await bcrypt.compare(password, staff.PasswordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const existing = await LoginRequestModel.findByStaff(staff.StaffId);
    if (existing.length) {
      return res.json({ message: "Waiting for admin approval..." });
    }

    await LoginRequestModel.create(staff.StaffId);
    // notify admins
    io.emit("new_login_request", { staff: { StaffId: staff.StaffId, Name: staff.Name, Username: staff.Username, IdCardNumber: staff.IdCardNumber } });
    return res.json({ message: "Login request sent. Waiting for admin approval.", staffId: staff.StaffId });
  } catch (err) {
    console.error("LoginRequest Error", err);
    return res.status(500).json({ error: err.message });
  }
}
