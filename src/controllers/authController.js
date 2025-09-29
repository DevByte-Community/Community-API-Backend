import { logoutUser } from "../services/userService.js";

// Logout user
export async function logout(req, res) {
  try {
    const userId = req.user.id; // set by auth middleware
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    const result = await logoutUser(userId, refreshToken);

    // Clear cookies (optional, if tokens stored in cookies)
    res.clearCookie("refreshToken", { httpOnly: true, secure: true });

    console.info(`[LOGOUT] userId=${userId} at ${new Date().toISOString()}`);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
}