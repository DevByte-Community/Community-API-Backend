import { logoutUser } from "../../src/services/userService.js";
import { RefreshToken } from "../../src/models/user.js";

jest.mock("../../src/models", () => ({
  RefreshToken: { destroy: jest.fn() }
}));

describe("logoutUser", () => {
  it("should delete refresh token", async () => {
    RefreshToken.destroy.mockResolvedValue(1);

    const result = await logoutUser(1, "dummy-token");
    expect(result.success).toBe(true);
    expect(result.message).toBe("Logged out successfully");
    expect(RefreshToken.destroy).toHaveBeenCalledWith({
      where: { userId: 1, token: "dummy-token" }
    });
  });
});
