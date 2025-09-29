// Assume you store refresh tokens in a RefreshToken table (linked to User).
import { RefreshToken } from "../models/user.js";

export async function logoutUser(userId, refreshToken) {
  if (!refreshToken) {
    throw new Error("No refresh token provided");
  }

  // Invalidate token (delete from DB)
  await RefreshToken.destroy({
    where: { userId, token: refreshToken }
  });

  return { success: true, message: "Logged out successfully" };
}