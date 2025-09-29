// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

export async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    if (!req.user) throw new Error("User not found");
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
}
