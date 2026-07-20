import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Ensure compatibility with the user's requested syntax for @google/genai
// Automates the API key access by creating an internal client with process.env.GEMINI_API_KEY
if (!GoogleGenAI.prototype.create) {
  GoogleGenAI.prototype.create = async function ({ model, input }) {
    const apiKeyToUse = process.env.GEMINI_API_KEY;
    if (!apiKeyToUse) {
      throw new Error("GEMINI_API_KEY is not defined in the backend environment variables.");
    }
    
    const tempAi = new GoogleGenAI({ apiKey: apiKeyToUse });
    const response = await tempAi.models.generateContent({
      model: model,
      contents: input,
    });
    
    return {
      output_text: response.text,
    };
  };
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Default Root Route
app.get("/", (req, res) => {
  res.json({ message: "Reverse Diary API is running successfully!" });
});

// MongoDB connection (supports both MONGODB_URI and MONGO_URI environment variables)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/micro-prompt-journal";
if (process.env.MONGODB_URI) {
  console.log("✔ Database Configuration: MONGODB_URI environment variable detected.");
} else if (process.env.MONGO_URI) {
  console.log("✔ Database Configuration: MONGO_URI environment variable detected.");
} else {
  console.log("⚠️ Database Configuration: No database environment variable detected. Falling back to localhost.");
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// MongoDB schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: { type: String, default: "" }, // Settable on first-time dashboard access
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'subadmin', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const entrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  prompt: { type: String, required: true },
  summaryEntry: { type: String, required: true }
});

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Automatically expires and gets deleted in 5 minutes
});

const User = mongoose.model("User", userSchema);
const Entry = mongoose.model("Entry", entrySchema);
const Otp = mongoose.model("Otp", otpSchema);

// JWT Secret Key configuration
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_session_key_9918237";

// Nodemailer Transporters configuration
// 1. Primary Sub-Admin Transporter (Sends registration OTP & regular user OTP)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// 2. Master Admin Transporter (Sends Master Admin OTP from Admin's own Gmail)
const adminTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.ADMIN_EMAIL_PASS || process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Access denied. Authentication token missing." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Session expired or user deleted." });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate with a valid session." });
  }
};

// Master Admin Authorization Middleware
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Master Administrator privileges required." });
  }
};

// Admin or Sub-Admin Authorization Middleware
const adminOrSubAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "subadmin")) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Sub-Admin or Master Administrator privileges required." });
  }
};

// --- AUTHENTICATION ROUTES ---

// Generate and Send OTP (for sign-up validation)
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    // Generate random 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Wipe any existing codes for this email
    await Otp.deleteMany({ email: email.trim().toLowerCase() });

    // Save code to database
    const otpRecord = new Otp({
      email: email.trim().toLowerCase(),
      otp: generatedOtp
    });
    await otpRecord.save();

    // Check if any Sub-Admin account currently exists
    const subAdminCount = await User.countDocuments({ role: "subadmin" });
    const useSubAdminMail = subAdminCount > 0 && process.env.EMAIL_USER && process.env.EMAIL_PASS;
    const activeTransporter = useSubAdminMail ? transporter : adminTransporter;
    const activeSenderEmail = useSubAdminMail 
      ? process.env.EMAIL_USER 
      : (process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER);

    let emailSent = false;
    if (activeSenderEmail) {
      try {
        const mailOptions = {
          from: `"Reverse Diary" <${activeSenderEmail}>`,
          to: email.trim().toLowerCase(),
          subject: "Your Reverse Diary Verification Code",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #8B5CF6; margin-bottom: 5px; font-weight: 800; text-align: center; letter-spacing: -0.5px;">Reverse Diary</h2>
              <p style="font-size: 13px; color: #0d9488; text-align: center; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center;">Welcome to Reverse Diary. Use the verification code below to verify your email address and complete registration:</p>
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 30px; text-align: center; margin: 25px 0; border: 1px dashed #cbd5e1;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${generatedOtp}</span>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 20px;">This code is valid for 5 minutes. If you did not request this code, please disregard it.</p>
            </div>
          `
        };

        await activeTransporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`[Email] Registration OTP sent to: ${email} (via ${activeSenderEmail})`);
      } catch (mailError) {
        console.error("[Email] Failed to dispatch registration OTP:", mailError.message);
      }
    }

    // Print in server console as fallback / debugger utility
    console.log("\n==================================================");
    console.log(`🔒 SECURITY KEY FOR NEW USER: ${email.toUpperCase()}`);
    console.log(`🔢 ONE-TIME PASSWORD (OTP) CODE IS:  ${generatedOtp}  `);
    console.log(`⏳ VALID FOR: 5 MINUTES (Auto-expiring)`);
    console.log(emailSent ? `📤 STATUS: Sent to ${email}` : `📤 STATUS: Logged to console (email credentials not set)`);
    console.log("==================================================\n");

    const responseMessage = emailSent 
      ? "Verification code sent to your email inbox!" 
      : "Verification code generated! Please check your VS Code server terminal console logs to retrieve it.";

    res.json({ message: responseMessage });
  } catch (error) {
    res.status(500).json({ error: "Failed to create verification code: " + error.message });
  }
});

// User Registration (with Email, Password, and OTP)
app.post("/api/auth/register", async (req, res) => {
  const { email, password, otp } = req.body;

  if (!email || !password || !otp) {
    return res.status(400).json({ error: "Email, password, and OTP code are required." });
  }

  try {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    // Verify OTP code
    const otpRecord = await Otp.findOne({ email: email.trim().toLowerCase(), otp: otp.trim() });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP code." });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // Auto-escalate first user to Admin, or ruok to Sub-Admin
    const userCount = await User.countDocuments();
    let assignedRole = userCount === 0 ? "admin" : "user";
    if (assignedRole !== "admin" && email.trim().toLowerCase().includes("ruok")) {
      assignedRole = "subadmin";
    }

    const user = new User({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
      username: "" // Chosen post-registration on first login
    });

    await user.save();

    // Remove validated OTP code
    await Otp.deleteMany({ email: email.trim().toLowerCase() });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed: " + error.message });
  }
});

// User Login (with Email and Password)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// Get Current Session User profile (Auto-syncs role & username changes)
app.get("/api/auth/me", auth, async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    username: req.user.username,
    role: req.user.role
  });
});

// Change Password (Requires logged-in session, current password & new password)
app.post("/api/auth/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current password and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  try {
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 8);
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to change password: " + error.message });
  }
});

// Unified Forgot Password Request (Handles Admin, Sub-Admin, and Regular Users)
app.post("/api/auth/forgot-password-check", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email address is required." });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "No account found registered with this email." });
    }

    // Count active Sub-Admins in system
    const subAdminCount = await User.countDocuments({ role: "subadmin" });

    // Determine email sender and transporter:
    // 1. If Master Admin ('admin') OR Sub-Admin ('subadmin') OR NO active Sub-Admin exists (subAdminCount === 0):
    //    -> Send OTP from Master Admin's Email (ADMIN_EMAIL_USER)
    // 2. If Regular User ('user') AND a Sub-Admin exists (subAdminCount > 0):
    //    -> Send OTP from Sub-Admin's Email (EMAIL_USER)
    const mustUseAdminMail = user.role === 'admin' || user.role === 'subadmin' || subAdminCount === 0;

    const activeTransporter = mustUseAdminMail ? adminTransporter : transporter;
    const activeSenderEmail = mustUseAdminMail 
      ? (process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER)
      : (process.env.EMAIL_USER || process.env.ADMIN_EMAIL_USER);

    // Generate 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: email.trim().toLowerCase() });

    const otpRecord = new Otp({
      email: email.trim().toLowerCase(),
      otp: generatedOtp
    });
    await otpRecord.save();

    let emailSent = false;

    if (activeSenderEmail) {
      try {
        const mailOptions = {
          from: `"Reverse Diary" <${activeSenderEmail}>`,
          to: email.trim().toLowerCase(),
          subject: "Password Reset Verification Code",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #8B5CF6; margin-bottom: 5px; font-weight: 800; text-align: center; letter-spacing: -0.5px;">Reverse Diary</h2>
              <p style="font-size: 13px; color: #0d9488; text-align: center; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">Password Reset Request</p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center;">Use the verification code below to reset your account password:</p>
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 30px; text-align: center; margin: 25px 0; border: 1px dashed #cbd5e1;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${generatedOtp}</span>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">This code is valid for 5 minutes. If you did not request this code, please disregard it.</p>
            </div>
          `
        };

        await activeTransporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`[Email] Password reset OTP dispatched to: ${email} (via ${activeSenderEmail})`);
      } catch (mailError) {
        console.error("[Email] Failed to dispatch password reset OTP:", mailError.message);
      }
    }

    res.json({
      isAdmin: user.role === 'admin',
      message: emailSent 
        ? "Verification code sent to your email inbox!" 
        : "Verification code generated! Check server console log."
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to request password reset: " + error.message });
  }
});

// Unified Reset Password Submit (Requires valid OTP for all users)
app.post("/api/auth/reset-password-submit", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, OTP verification code, and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "No account found registered with this email." });
    }

    if (user.role === 'subadmin') {
      return res.status(403).json({ error: "Sub-Admin password reset is restricted. Contact Master Admin." });
    }

    const otpRecord = await Otp.findOne({ email: email.trim().toLowerCase(), otp: otp.trim() });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP verification code." });
    }

    user.password = await bcrypt.hash(newPassword, 8);
    await user.save();

    await Otp.deleteMany({ email: email.trim().toLowerCase() });

    res.json({ message: "Password reset successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password: " + error.message });
  }
});

// Update Username (First-time user onboarding setup)
app.post("/api/users/username", auth, async (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username cannot be empty." });
  }

  try {
    const user = await User.findById(req.user._id);
    user.username = username.trim();
    if (user.username.toLowerCase() === "ruok" && user.role !== "admin") {
      user.role = "subadmin";
    }
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to set username: " + error.message });
  }
});

// --- SECURED DIARY ENTRIES ROUTES ---

// Submit new entry
app.post("/api/entries", auth, async (req, res) => {
  const { rawTranscript, prompt } = req.body;

  if (!rawTranscript || !prompt) {
    return res.status(400).json({ error: "Both rawTranscript and prompt are required." });
  }

  try {
    const ai = new GoogleGenAI({});
    const interaction = await ai.create({
      model: "gemini-3.5-flash",
      input: `Condense the following raw personal thoughts into a single, clean, objective bullet point sentence summarizing the concrete takeaway. Raw Text: "${rawTranscript}"`
    });

    const cleanSummary = interaction.output_text.trim();

    const entry = new Entry({
      user: req.user._id,
      date: new Date(),
      prompt: prompt,
      summaryEntry: cleanSummary
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error processing entry:", error);
    res.status(500).json({ error: "Failed to process entry: " + error.message });
  }
});

// Get user-specific entries (UNLIMITED)
app.get("/api/entries", auth, async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// Get user-specific AI trends insights (Requires last 30 entries as representative sample)
app.get("/api/insights", auth, async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.user._id }).sort({ date: -1 }).limit(30);
    
    if (entries.length === 0) {
      return res.json({
        badges: ["Awaiting First Log"],
        insights: [
          {
            title: "Write an entry to begin",
            description: "Once you have logs, Gemini will parse patterns in colors, places, weather, and routines."
          }
        ]
      });
    }

    const summaries = entries.map(e => `- Prompt: "${e.prompt}" | Summary: "${e.summaryEntry}"`).join("\n");

    const ai = new GoogleGenAI({});
    const response = await ai.create({
      model: "gemini-3.5-flash",
      input: `Analyze the following daily journal summaries to identify recurring themes, patterns, or trends (e.g., recurring colors, places, weather changes, objects, routines, or subjects).
      
Summaries:
${summaries}

You must return a valid JSON object strictly matching this schema. Do not output markdown code blocks (such as \`\`\`json), just raw JSON:
{
  "badges": ["Theme 1", "Theme 2", "Theme 3"],
  "insights": [
    {
      "title": "Insight Title",
      "description": "Detailed explanation of the pattern found (e.g., color, location, or environment)."
    }
  ]
}`
    });

    let data;
    try {
      let text = response.output_text.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse Gemini output:", response.output_text);
      data = {
        badges: ["Themes Found"],
        insights: [{ title: "Analysis Results", description: response.output_text }]
      };
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate insights: " + error.message });
  }
});

// --- ADMIN & SUB-ADMIN SYSTEM ROUTES ---

// Get general dashboard stats (Admin or Sub-Admin)
app.get("/api/admin/stats", auth, adminOrSubAdminAuth, async (req, res) => {
  try {
    const isSubAdmin = req.user.role === 'subadmin';
    const userQuery = isSubAdmin ? { role: 'user' } : {};
    
    const totalUsers = await User.countDocuments(userQuery);
    
    let totalEntries = 0;
    if (isSubAdmin) {
      const regularUsers = await User.find({ role: 'user' }, { _id: 1 });
      const userIds = regularUsers.map(u => u._id);
      totalEntries = await Entry.countDocuments({ user: { $in: userIds } });
    } else {
      totalEntries = await Entry.countDocuments();
    }

    const avgEntries = totalUsers > 0 ? (totalEntries / totalUsers).toFixed(1) : 0;

    res.json({
      totalUsers,
      totalEntries,
      averageEntriesPerUser: parseFloat(avgEntries)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load stats: " + error.message });
  }
});

// Get user list with stats (Admin or Sub-Admin)
// Sub-Admin CANNOT see admin users
app.get("/api/admin/users", auth, adminOrSubAdminAuth, async (req, res) => {
  try {
    const isSubAdmin = req.user.role === 'subadmin';
    const userQuery = isSubAdmin ? { role: 'user' } : {};
    
    const users = await User.find(userQuery, { password: 0 }).sort({ createdAt: -1 });

    const userList = await Promise.all(users.map(async (u) => {
      const entryCount = await Entry.countDocuments({ user: u._id });
      return {
        _id: u._id,
        email: u.email,
        username: u.username || "(Not Set)",
        role: u.role,
        createdAt: u.createdAt,
        entryCount
      };
    }));

    res.json(userList);
  } catch (error) {
    res.status(500).json({ error: "Failed to load users: " + error.message });
  }
});

// Get entries feed (Admin or Sub-Admin)
// Sub-Admin CANNOT see admin daily activities or entries
app.get("/api/admin/entries", auth, adminOrSubAdminAuth, async (req, res) => {
  try {
    const isSubAdmin = req.user.role === 'subadmin';
    let entries = await Entry.find({})
      .populate("user", "username email role")
      .sort({ date: -1 });

    if (isSubAdmin) {
      // Strictly filter out any entries from Admin or Sub-Admin accounts
      entries = entries.filter(e => e.user && e.user.role === 'user');
    }

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to load entries: " + error.message });
  }
});

// Update User Role (Master Admin Only)
app.put("/api/admin/users/:userId/role", auth, adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'subadmin', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({ message: `Role updated to ${role}`, user: { _id: targetUser._id, role: targetUser.role } });
  } catch (error) {
    res.status(500).json({ error: "Failed to update role: " + error.message });
  }
});

// Master Admin Direct User & Sub-Admin Password Override
app.put("/api/admin/users/:userId/password", auth, adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    targetUser.password = await bcrypt.hash(newPassword, 8);
    await targetUser.save();

    res.json({ message: `Password for ${targetUser.username || targetUser.email} updated successfully.` });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user password: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
