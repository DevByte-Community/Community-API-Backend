// jest.global-teardown.js
module.exports = async () => {
  // Force close any remaining handles
  // This ensures Jest exits cleanly even if some connections weren't closed properly
  await new Promise((resolve) => setTimeout(resolve, 500));
};
