# --- Optional .env support for local development ---------------------------
try:
    from dotenv import load_dotenv
    from pathlib import Path

    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print("[INFO] Local .env loaded from", env_path)
except ModuleNotFoundError:
    # python-dotenv isn’t installed (e.g., on EC2) – that’s fine.
    pass


import os
import time
import threading
import signal
import audio2
import google.generativeai as genai
from audio2 import playback_lock, request_stop
from dotenv import load_dotenv
load_dotenv()


# --- Startup Log ---
print("[INFO] memory.py started")

# --- Load Gemini API Key ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)

user_counter = 1
ai_counter = 1
stop_requested = False
active_threads = []

# --- Pause Flag ---
PAUSE_FLAG_FILE = "server/pause_flag.txt"

def is_paused():
    try:
        with open(PAUSE_FLAG_FILE, "r") as f:
            return f.read().strip() == "1"
    except:
        return False

# --- Load Resume Context ---
try:
    with open("server/resume_context.txt", "r", encoding="utf-8") as f:
        resume_text = f.read()
        print("[INFO] Resume context loaded.")
except Exception as e:
    print(f"[WARN] Could not load resume context: {e}")
    resume_text = "Resume content not available."

# --- System Prompt Setup ---
resume_preface = f"""
You are simulating a highly prepared job applicant being interviewed live by a recruiter or hiring manager.

Your behavior must follow these rules:

🎯 PERSONAL/EXPERIENCE QUESTIONS:
- For questions like "Tell me about yourself", "What are your skills", or "Describe your experience":
  → Answer ONLY using the resume content provided below.
  → Be specific: mention project names, tools, results, company names, metrics, and achievements.
  → Speak confidently and naturally — never robotic or vague.
  → Do NOT fabricate anything. Stick exactly to what’s in the resume.

🧠 TECHNICAL/GENERAL QUESTIONS:
- For questions like "What is Docker?" or "Explain REST APIs":
  → Give a concise, clear explanation — as a confident candidate would.
  → If possible, relate the answer back to a project or role from the resume.
  → If it's not in the resume, that's okay — just answer accurately and professionally.
  → DO NOT mention LLMs, AI, Gemini, or anything system-related.

🗣️ TONE & STYLE:
- Always sound like a real person.
- Do NOT say "according to my resume" or "as mentioned". Just speak as if this is your lived experience.
- If the question is vague, assume the interviewer wants a resume-based example.

📄 RESUME CONTEXT:
{resume_text}

Now, begin acting as the candidate and answer all upcoming questions as if you are in a real job interview. Be detailed, honest, and human.
"""

# --- Signal Handling ---
def handle_sigint(sig, frame):
    global stop_requested
    print("\n[STOP] Ctrl+C detected. Finishing current conversation and exiting...")
    stop_requested = True
    request_stop()

signal.signal(signal.SIGINT, handle_sigint)

# --- Gemini Setup ---
model = genai.GenerativeModel("gemini-1.5-pro")

while True:
    try:
        chat_session = model.start_chat()
        chat_session.send_message(resume_preface)
        print("[INFO] Gemini chat session initialized.")
        break
    except Exception as e:
        if "429" in str(e):
            print(f"[WARN] Rate limit exceeded during init. Retrying...")
            time.sleep(60)
        else:
            print(f"[ERROR] Gemini initialization failed: {e}")
            exit(1)

# --- Personal Question Classifier ---
def is_personal_question(text):
    personal_keywords = [
        "tell me about yourself", "your skills", "your experience", "what have you done",
        "projects", "background", "walk me through", "what did you work on",
        "strengths", "weaknesses"
    ]
    return any(kw in text.lower() for kw in personal_keywords)

# --- Gemini Chat Function ---
def chat_with_gemini_async(user_input, ai_counter_local):
    max_retries = 3
    attempt = 0
    while attempt < max_retries:
        try:
            if user_input.strip().lower() in ["how are you", "how are you doing"]:
                print("[AI Response] I'm doing well, thank you!")
                return

            prompt = (
                f"{resume_preface}\nInterviewer: {user_input}\nCandidate:"
                if is_personal_question(user_input)
                else f"Interviewer: {user_input}\nCandidate:"
            )

            response = chat_session.send_message(prompt)
            assistant_message = response.text

            with open("server/ai_responses_log.txt", "a", encoding="utf-8") as f:
                f.write(f"User_Q{user_counter}: {user_input.strip()}\n")
                f.write(f"AI_Q{ai_counter_local}: {assistant_message.strip()}\n\n")

            # 👇 Replaced speak() with simple print
            break

        except Exception as e:
            if "429" in str(e):
                print(f"[WARN] Rate limit hit during chat. Retrying...")
                time.sleep(60)
                attempt += 1
            else:
                print(f"[ERROR] Gemini error: {e}")
                with open("server/ai_responses_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"AI_Q{ai_counter_local}: Error generating response\n\n")
                break

# --- Main Loop ---
try:
    print("[INFO] Gemini Assistant is live and listening continuously...")
    with open("server/ai_responses_log.txt", "w", encoding="utf-8") as f:
        f.write("---- New Session ----\n\n")

    while not stop_requested:
        if is_paused():
            time.sleep(1)
            continue

        print("[INFO] Listening for user input...")

        if playback_lock.locked():
            print("[WAIT] Still speaking... Waiting before retrying...\n")
            time.sleep(1.0)
            continue

        try:
            user_input = audio2.listen()
        except Exception as e:
            print(f"[ERROR] audio2.listen() failed: {e}")
            continue

        print(f"[DEBUG] Raw input: {user_input}")

        if stop_requested:
            break
        if not user_input.strip():
            print("[WARN] No speech detected. Waiting...\n")
            continue
        if playback_lock.locked():
            print("[WAIT] Still speaking... Waiting before retrying...\n")
            time.sleep(1.0)
            continue

        print(f"[INFO] User said: {user_input}")

        if any(x in user_input.lower() for x in ["quit", "exit", "stop", "end session"]):
            print("[AI Response] Ending conversation. Goodbye!")
            break

        thread = threading.Thread(target=chat_with_gemini_async, args=(user_input, ai_counter))
        thread.daemon = True
        thread.start()
        active_threads.append(thread)

        user_counter += 1
        ai_counter += 1

    print("[INFO] Waiting for all AI responses to complete...")
    for thread in active_threads:
        thread.join(timeout=5)

    print("[INFO] Stopping audio playback if still running...")
    while playback_lock.locked():
        print("[WAIT] Waiting for audio lock to release...")
        time.sleep(0.2)

    print("[INFO] Assistant exited cleanly. Take care!")

except Exception as e:
    print(f"[ERROR] Error occurred: {e}")
    with open("server/ai_responses_log.txt", "a", encoding="utf-8") as f:
        f.write(f"Error: {str(e)}\n\n")
