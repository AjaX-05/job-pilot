import express from "express";
import { PythonShell } from "python-shell";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";
import cors from "cors";
import { exec } from "child_process";
import { promisify } from "util";
import multer from "multer";

const execAsync = promisify(exec);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let pythonProcess = null;
let pythonPath = null;
const logFile = join(__dirname, "ai_responses_log.txt");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "server/uploads/");
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = file.originalname.substring(file.originalname.lastIndexOf("."));
    cb(null, `${timestamp}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    const ext = file.originalname
      .substring(file.originalname.lastIndexOf("."))
      .toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOCX, PNG, JPG files are allowed."
        )
      );
    }
  },
});

async function getPythonInfo() {
  const isWindows = process.platform === "win32";
  const pythonCommands = isWindows
    ? ['py -3 -c "import sys; print(sys.executable)"', "py -3 --version"]
    : ["which python3", "python3 --version"];

  try {
    const { stdout: pythonPath } = await execAsync(pythonCommands[0]);
    const { stdout: version } = await execAsync(pythonCommands[1]);

    const cleanPath = pythonPath.trim().replace(/^"|"$/g, "");
    console.log("Python path:", cleanPath);
    console.log("Python version:", version.trim());

    return cleanPath;
  } catch (error) {
    console.error("Error getting Python info:", error);
    if (isWindows) {
      try {
        const { stdout: pythonPath } = await execAsync(
          'python -c "import sys; print(sys.executable)"'
        );
        const { stdout: version } = await execAsync("python --version");
        const cleanPath = pythonPath.trim().replace(/^"|"$/g, "");
        console.log("Python path (fallback):", cleanPath);
        console.log("Python version (fallback):", version.trim());
        return cleanPath;
      } catch (fallbackError) {
        console.error("Fallback Python detection failed:", fallbackError);
        throw new Error("Failed to detect Python installation");
      }
    }
    throw new Error("Failed to detect Python installation");
  }
}

async function checkPythonDependencies(pythonPath) {
  const requiredPackages = [
    "pyaudio",
    "pygame",
    "webrtcvad",
    "google-generativeai",
    "deepgram-sdk",
    "pdfplumber",
    "python-docx",
    "Pillow",
  ];

  try {
    for (const pkg of requiredPackages) {
      try {
        await execAsync(`"${pythonPath}" -m pip show ${pkg.split("==")[0]}`);
        console.log(`✓ ${pkg} is installed`);
      } catch (error) {
        console.log(`Installing ${pkg}...`);
        await execAsync(`"${pythonPath}" -m pip install --no-cache-dir ${pkg}`);
        console.log(`✓ ${pkg} installed successfully`);
      }
    }
    return true;
  } catch (error) {
    console.error("Error installing Python dependencies:", error);
    return false;
  }
}

async function initializePythonEnvironment() {
  if (!pythonPath) {
    console.log("Initializing Python environment...");
    pythonPath = await getPythonInfo();
    await checkPythonDependencies(pythonPath);
    console.log("Python environment initialized successfully");
  }
  return pythonPath;
}

async function startInterviewSession() {
  if (pythonProcess) {
    console.log("[INFO] Interview already running");
    return;
  }

  validateEnvVariables();
  await fs.writeFile(logFile, "---- New Session ----\n\n", { flag: "w" });

  const options = {
    mode: "text",
    pythonPath,
    pythonOptions: ["-u"],
    scriptPath: __dirname,
    env: {
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      PYTHONUNBUFFERED: "1",
      PYTHONPATH: __dirname,
    },
  };

  return new Promise((resolve, reject) => {
    pythonProcess = new PythonShell("memory.py", options);

    const timeout = setTimeout(() => {
      reject(new Error("Python process initialization timeout"));
    }, 30000);

    pythonProcess.on("message", (message) => {
      console.log("Python output:", message);
      if (message.includes("[INFO] Gemini Assistant is live")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    pythonProcess.on("stderr", (stderr) => {
      console.error("Python stderr:", stderr);
    });

    pythonProcess.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Python error:", err);
      reject(err);
    });

    pythonProcess.on("close", (code, signal) => {
      clearTimeout(timeout);
      console.log(
        `Python process exited with code ${code} and signal ${signal}`
      );
      pythonProcess = null;
    });
  });
}

function validateEnvVariables() {
  const required = ["DEEPGRAM_API_KEY", "GEMINI_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

try {
  await fs.mkdir(join(__dirname, "uploads"), { recursive: true });
} catch (err) {
  console.error("Error creating uploads directory:", err);
}

await initializePythonEnvironment();

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const options = {
      mode: "text",
      pythonPath,
      pythonOptions: ["-u"],
      scriptPath: __dirname,
      args: [req.file.path],
    };

    const pyshell = new PythonShell("parse_resume.py", options);

    let parseError = null;
    pyshell.on("message", (message) => console.log("Python output:", message));
    pyshell.on("error", (err) => {
      parseError = err;
      console.error("Error parsing resume:", err);
    });

    await new Promise((resolve, reject) => {
      pyshell.end((err) => {
        if (err || parseError) {
          reject(err || parseError);
        } else {
          resolve(null);
        }
      });
    });

    console.log("[INFO] Resume parsed. Starting interview session...");

    try {
      await startInterviewSession();
      res.json({ message: "Resume parsed and interview started." });
    } catch (startErr) {
      console.error("Failed to start interview:", startErr);
      res
        .status(500)
        .json({ error: "Resume parsed but failed to start interview" });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/analyze-problem", upload.single("image"), async (req, res) => {
  console.log("[ROUTE] /analyze-problem called");
  try {
    if (!req.file) {
      console.error("[ERROR] No image uploaded");
      return res.status(400).json({ error: "No image uploaded" });
    }
    console.log("[INFO] Image uploaded:", req.file.path);

    const options = {
      mode: "text",
      pythonPath:
        "C:\\Users\\Jax\\AppData\\Local\\Programs\\Python\\Python312\\python.exe", // update if needed
      pythonOptions: ["-u"],
      scriptPath: __dirname,
      args: [req.file.path],
    };

    console.log("[INFO] About to run problem_solver.py with:", req.file.path);

    PythonShell.run("problem_solver.py", options)
      .then((output) => {
        console.log("[INFO] Python output received:", output);
        const result = output ? output.join("\n") : "";
        res.json({ analysis: result });
        console.log("[INFO] Response sent to frontend");
      })
      .catch((err) => {
        console.error("[ERROR] PythonShell error:", err);
        res.status(500).json({ error: err.message });
      });

    console.log("[INFO] PythonShell.run called, waiting for callback...");
  } catch (error) {
    console.error("[ERROR] Exception in /analyze-problem:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/stop", (req, res) => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    res.json({ status: "Interview stopped" });
  } else {
    res.status(400).json({ error: "No interview in progress" });
  }
});

app.get("/latest", async (req, res) => {
  try {
    const content = await fs.readFile(logFile, "utf8");
    const lines = content.split("\n");

    let lastUserSaid = "";
    let lastAiSaid = "";

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("User_Q") && !lastUserSaid) {
        lastUserSaid = line.split(":")[1].trim();
      }
      if (line.startsWith("AI_Q") && !lastAiSaid) {
        lastAiSaid = line.split(":")[1].trim();
      }
      if (lastUserSaid && lastAiSaid) break;
    }

    res.json({ userSaid: lastUserSaid, aiSaid: lastAiSaid });
  } catch (error) {
    console.error("Failed to read latest responses:", error);
    res.status(500).json({ error: "Failed to read latest responses" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
