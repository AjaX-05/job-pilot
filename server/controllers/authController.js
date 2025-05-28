import jwt from "jsonwebtoken";
import User from "../models/User.js";

// 🔐 Generate JWT token with id + email
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// 🧑 Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🔐 Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        token: generateToken(user),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🙋‍♂️ Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("[GET USER ERROR]", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🔁 Simulate sending OTP for password reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with that email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes

    await user.save({ validateBeforeSave: false });

    console.log(`🟡 OTP for ${email}: ${otp}`); // Simulated "email" (prints to console)

    res.json({ message: "OTP sent successfully to your email (simulated)" });
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🔐 Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      user.resetOtp !== otp ||
      !user.resetOtpExpires ||
      user.resetOtpExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;

    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
