const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. Token missing." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "super_secret_cloudy_jwt_key_12345!"
    );

    const user = await User.findById(decoded.userId).select("-password -otpCode -otpExpiresAt");

    if (!user) {
      return res.status(401).json({ error: "User no longer exists or session expired." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth Middleware Error]:", error.message);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;
