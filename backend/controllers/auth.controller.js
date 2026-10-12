const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const randomize = require("randomatic");
const User = require("../models/User");
const { sendOTPEmail } = require("../services/mail.service");

// Signup
const signup = async (req, res, next) => {
  const { email, fullName, password } = req.body;

  if (!email || !fullName || !password) {
    return res.status(400).json({ error: "Email, Full Name, and Password are required" });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      return res.status(400).json({ error: "Email is already registered. Please sign in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      password: hashedPassword,
    });

    // 6-digit numeric OTP
    const otp = randomize("0", 6);
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await user.save();
    await sendOTPEmail(email, otp);

    return res.json({ accountId: user._id.toString() });
  } catch (error) {
    next(error);
  }
};

// Signin
const signin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and Password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const otp = randomize("0", 6);
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();
    await sendOTPEmail(email, otp);

    return res.json({ accountId: user._id.toString() });
  } catch (error) {
    next(error);
  }
};

// Resend OTP
const resendOTP = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = randomize("0", 6);
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();
    await sendOTPEmail(email, otp);

    return res.json({ accountId: user._id.toString() });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
const verifyOTP = async (req, res, next) => {
  const { accountId, password } = req.body; // password is OTP from frontend

  if (!accountId || !password) {
    return res.status(400).json({ error: "AccountId and OTP are required" });
  }

  try {
    const user = await User.findById(accountId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.otpCode || user.otpCode !== password || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Clear OTP
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    // Create JWT
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "super_secret_cloudy_jwt_key_12345!",
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      sessionId: user._id.toString(),
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// Get Current User Profile (me)
const getMe = async (req, res) => {
  return res.json(req.user.toJSON());
};

// Get User by ID (for populating file owner)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -otpCode -otpExpiresAt");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  signin,
  resendOTP,
  verifyOTP,
  getMe,
  getUserById,
};
