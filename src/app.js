/**
 * App Entry Point
 * ---------------
 * Sets up the Express app, middleware, and routes.
 */

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const routes = require("./routes"); // auto-loads index.js from routes folder

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API routes
app.use("/api", routes);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the DevByte Community API 🚀" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;
