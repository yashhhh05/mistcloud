const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const inMemoryStore = require("../config/inMemoryStore");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_cloudy_jwt_key_12345!";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No authentication token provided." });
    }

    const token = authHeader.split(" ")[1]?.trim();

    if (!token) {
      return res.status(401).json({ error: "Access denied. Authentication token missing." });
    }

    let userId = null;

    // 1. Verify JWT signature & expiration
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (jwtErr) {
      // Allow valid in-memory session ID if issued by auth controller
      const memUser = inMemoryStore.findUserById(token);
      if (memUser) {
        userId = memUser._id || memUser.$id;
      } else {
        return res.status(401).json({ error: "Invalid or expired authentication token." });
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    // 2. Fetch authenticated user from Database or in-memory store
    let user = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(userId).select("-password -otpCode -otpExpiresAt");
      } catch (err) {
        user = null;
      }
    }

    if (!user) {
      user = inMemoryStore.findUserById(userId);
    }

    // 3. Reject if user does not exist
    if (!user) {
      return res.status(401).json({ error: "User not found or session has expired." });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth Middleware Error]:", error.message);
    return res.status(401).json({ error: "Authentication failed. Please sign in again." });
  }
};

module.exports = authMiddleware;
