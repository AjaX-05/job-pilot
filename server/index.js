// Final merged index.js with additions from old version
import express from "express";
import { PythonShell } from "python-shell";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";
import path from "path";
import cors from "cors";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import multer from "multer";
import stripePkg from "stripe";

import webhookHandler from "./routes/stripe-webhook.js";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();
validateEnvVariables();

const execAsync = promisify(exec);
const stripe = stripePkg(process.env.STRIPE_SECRET_KEY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

let pythonProcess = null;
let screenshotProcess = null;
let pythonPath = null;

const logFile = join(__dirname, "ai_responses_log.txt");
const pauseFlagPath = join(__dirname, "pause_flag.txt");

// Start screenshot server (from old index.js)
function startScreenshotServer() {
  if (screenshotProcess) return;
  const screenshotPath = join(__dirname, "screenshot_server.py");
  screenshotProcess = spawn(pythonPath || "python", [screenshotPath]);
  screenshotProcess.stdout.on("data", (data) => {
    console.log(`[ScreenshotServer] ${data.toString().trim()}`);
  });
  screenshotProcess.stderr.on("data", (data) => {
    console.error(`[ScreenshotServer ERROR] ${data.toString().trim()}`);
  });
  screenshotProcess.on("close", (code) => {
    console.log(`[ScreenshotServer] exited with code ${code}`);
    screenshotProcess = null;
  });
}

async function initializePythonEnvironment() {
  if (!pythonPath) {
    pythonPath = await getPythonInfo();
    await checkPythonDependencies(pythonPath);
  }
  startScreenshotServer();
  return pythonPath;
}

try {
  await fs.mkdir(join(__dirname, "server/uploads"), { recursive: true });
} catch (err) {
  console.error("Uploads directory error:", err);
}

await connectDB();
await initializePythonEnvironment();

// Auth routes
app.use("/api/auth", authRoutes);
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const jwt = await import("jsonwebtoken");
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return cb(new Error("Missing or invalid authorization header"));
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      const userDir = join("server/uploads", userId);
      await fs.mkdir(userDir, { recursive: true });
      cb(null, userDir);
    } catch (err) {
      console.error("Resume upload path error:", err);
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `resume${ext}`;
      cb(null, filename);
    } catch (err) {
      console.error("Resume naming error:", err);
      cb(err);
    }
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowedTypes.includes(ext)
      ? cb(null, true)
      : cb(new Error("Invalid file type."));
  },
});

async function getPythonInfo() {
  const isWindows = process.platform === "win32";
  const pythonCommands = isWindows
    ? ["where python", "python --version"]
    : ["which python3", "python3 --version"];

  try {
    const { stdout: pathOut } = await execAsync(pythonCommands[0]);
    const { stdout: version } = await execAsync(pythonCommands[1]);
    const cleanPath = pathOut.trim().replace(/^"|"$/g, "");
    console.log("Python path:", cleanPath);
    console.log("Python version:", version.trim());
    return cleanPath;
  } catch (error) {
    console.error("Error detecting Python:", error);
    throw new Error("Python not found");
  }
}

async function checkPythonDependencies(pythonPath) {
  const pkgs = [
    "pyaudio",
    "pygame",
    "webrtcvad",
    "google-generativeai",
    "deepgram-sdk",
    "pdfplumber",
    "python-docx",
    "Pillow",
    "flask",
    "pyautogui",
  ];
  for (const pkg of pkgs) {
    try {
      await execAsync(`"${pythonPath}" -m pip show ${pkg}`);
    } catch {
      console.log(`Installing ${pkg}...`);
      await execAsync(`"${pythonPath}" -m pip install ${pkg}`);
    }
  }
}

function validateEnvVariables() {
  const required = [
    "DEEPGRAM_API_KEY",
    "GEMINI_API_KEY",
    "MONGO_URI",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_ID",
    "JWT_SECRET",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length)
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

try {
  await fs.mkdir(join(__dirname, "server/uploads"), { recursive: true });
} catch (err) {
  console.error("Uploads directory error:", err);
}

async function verifyJwtToken(req, res) {
  const jwt = await import("jsonwebtoken");
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header missing" });
    return null;
  }
  const tokenParts = authHeader.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    res.status(401).json({ error: "Authorization header malformed" });
    return null;
  }
  const token = tokenParts[1];
  try {
    return jwt.default.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

app.post("/api/check-access", async (req, res) => {
  try {
    const decoded = await verifyJwtToken(req, res);
    if (!decoded) return;

    const { default: User } = await import("./models/User.js");
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      is_paid: user.is_paid,
      freeTrialUsed: (user.free_interviews_used || 0) >= 1,
    });
  } catch (error) {
    console.error("Access check error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const decoded = await verifyJwtToken(req, res);
    if (!decoded) return;

    const { default: User } = await import("./models/User.js");
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "payment",
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
      metadata: { userId: user._id.toString() },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.post("/api/listen", async (req, res) => {
  try {
    if (!pythonPath) pythonPath = await initializePythonEnvironment();

    const result = await PythonShell.run("audio2.py", {
      mode: "text",
      pythonPath,
      pythonOptions: ["-u"],
      scriptPath: __dirname,
      args: ["--listen-only"],
    });

    const transcript = result.join(" ").trim();
    if (!transcript)
      return res.status(400).json({ error: "No speech detected" });

    res.json({ transcript });
  } catch (err) {
    console.error("Listen failed:", err);
    res.status(500).json({ error: "Listen failed" });
  }
});

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    if (!pythonPath) pythonPath = await initializePythonEnvironment();

    const decoded = await verifyJwtToken(req, res);
    if (!decoded) return;

    const { default: User } = await import("./models/User.js");
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.is_paid && user.free_interviews_used >= 1) {
      return res.status(403).json({ error: "Free trial ended" });
    }

    if (!user.is_paid) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { free_interviews_used: 1 },
      });
    }

    const pyshell = new PythonShell("parse_resume.py", {
      mode: "text",
      pythonPath,
      pythonOptions: ["-u"],
      scriptPath: __dirname,
      args: [req.file.path],
    });

    pyshell.on("message", (msg) => console.log("Python message:", msg));
    pyshell.on("stderr", (msg) => console.error("Python stderr:", msg));

    await new Promise((resolve, reject) => {
      pyshell.end((err, code, signal) => {
        if (err) {
          console.error("Python script error:", err);
          return reject(err);
        }
        console.log(`Python script exited with code ${code}, signal ${signal}`);
        resolve();
      });
    });

    res.json({ message: "Resume uploaded and parsed" });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.post("/api/send-question", async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Empty question" });
  }

  try {
    await fs.writeFile(
      join(__dirname, "server/queued_question.txt"),
      question.trim(),
      "utf-8"
    );
    res.json({ message: "Question queued successfully" });
  } catch (err) {
    console.error("[ERROR] Failed to write question to file:", err);
    res.status(500).json({ error: "Failed to queue question" });
  }
});

async function startInterviewSession() {
  if (pythonProcess) return;
  validateEnvVariables();
  await fs.writeFile(logFile, "---- New Session ----\n\n", { flag: "w" });

  pythonProcess = new PythonShell("memory.py", {
    mode: "text",
    pythonPath,
    pythonOptions: ["-u"],
    scriptPath: __dirname,
    env: {
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      PYTHONUNBUFFERED: "1",
      PYTHONPATH: __dirname,
      ...process.env,
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      PYTHONUNBUFFERED: "1",
      PYTHONPATH: __dirname,
    },
  });

  pythonProcess.on("message", (msg) => console.log("Python output:", msg));
  // 🔥 REMOVE this block — it's the duplicate
  // pythonProcess.on("close", (code) => {
  //   console.log("Python exited with code", code);
  //   pythonProcess = null;
  // });

  // ✅ Use end() once, which *does* give code/signal and resets pythonProcess
  pythonProcess.end((err, code, signal) => {
    if (err) console.error("memory.py error:", err);
    else console.log(`memory.py exited with code ${code}, signal ${signal}`);
    pythonProcess = null;
  });
}

app.post("/analyze-problem", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  if (!pythonPath) pythonPath = await initializePythonEnvironment();

  const lang = req.body.language || "";

  try {
    const output = await PythonShell.run("problem_solver.py", {
      mode: "text",
      pythonPath,
      pythonOptions: ["-u"],
      scriptPath: __dirname,
      args: [req.file.path, lang],
    });

    await fs.unlink(req.file.path).catch(() => {});
    res.json({ analysis: output.join("\n") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/pause", async (req, res) => {
  try {
    await fs.writeFile(pauseFlagPath, "1");
    res.json({ status: "Listening paused" });
  } catch (err) {
    res.status(500).json({ error: "Failed to pause listening" });
  }
});

app.post("/resume", async (req, res) => {
  try {
    await fs.writeFile(pauseFlagPath, "0");
    res.json({ status: "Listening resumed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to resume listening" });
  }
});

app.post("/stop", (req, res) => {
  if (pythonProcess) {
    pythonProcess.kill("SIGKILL");
    console.log("[INFO] Python interview process terminated.");
    pythonProcess = null;
    res.json({ status: "Interview stopped" });
  } else {
    res.status(400).json({ error: "No interview in progress" });
  }
});

app.get("/latest", async (req, res) => {
  try {
    const content = await fs.readFile(logFile, "utf8");
    const lines = content.split("\n").reverse();
    const userLine = lines.find((line) => line.startsWith("User_Q"));
    const aiLine = lines.find((line) => line.startsWith("AI_Q"));
    res.json({
      userSaid: userLine?.split(":")[1]?.trim() || "",
      aiSaid: aiLine?.split(":")[1]?.trim() || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read responses" });
  }
});

app.post("/start-interview", async (req, res) => {
  try {
    const decoded = await verifyJwtToken(req, res);
    if (!decoded) return;
    await startInterviewSession();
    res.json({ message: "Interview session started" });
  } catch (error) {
    console.error("Start interview error:", error);
    res.status(500).json({ error: "Failed to start interview session" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
