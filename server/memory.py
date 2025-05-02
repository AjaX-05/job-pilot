import os
import time
import threading
import signal
import audio2
import google.generativeai as genai
from audio2 import playback_lock, request_stop, stop_requested_by_main

# --- Gemini API Key ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)

user_counter = 1
ai_counter = 1
stop_requested = False
active_threads = []

# --- Load Resume Context ---
resume_text = ""
try:
    with open("server/resume_context.txt", "r", encoding="utf-8") as f:
        resume_text = f.read()
        print("[INFO] Resume context loaded.")
except Exception as e:
    print(f"[WARN] Could not load resume context: {e}")
    resume_text = "Resume content not available."

# --- System Prompt ---
resume_preface = (
    "You are simulating a highly prepared job applicant being interviewed live.\n"
    "The interviewer will ask questions, and your answers must come ONLY from the resume below.\n\n"
    "INSTRUCTIONS:\n"
    "1. Use the resume content directly in your answers — either as-is or summarized.\n"
    "2. Mention specific project names, technologies, achievements, metrics, and company names.\n"
    "3. Always sound like a real person — confident, natural, and professional.\n"
    "4. If the question is vague, assume it's asking for an example from the resume.\n"
    "5. DO NOT make up projects or technologies that aren't in the resume.\n"
    "6. DO NOT say 'according to my resume' or 'as mentioned' — just say it like you lived it.\n"
    "7. If the resume doesn't mention something, say you're happy to discuss, but it’s not listed in detail.\n\n"
    "Here is your resume content:\n\n"
    f"{resume_text}\n\n"
    "Begin answering questions as if you're in a real interview. Be detailed and specific."
)

# --- Ctrl+C Handling ---
def handle_sigint(sig, frame):
    global stop_requested
    print("\n[STOP] Ctrl+C detected. Finishing current conversation and exiting...")
    stop_requested = True
    request_stop()

signal.signal(signal.SIGINT, handle_sigint)

# --- Gemini Session Initialization ---
model = genai.GenerativeModel("gemini-1.5-pro")
chat_session = model.start_chat()
chat_session.send_message(resume_preface)

# --- Chat Function ---
def chat_with_gemini_async(user_input, ai_counter_local):
    try:
        response = chat_session.send_message(user_input)
        assistant_message = response.text

        with open("server/ai_responses_log.txt", "a", encoding="utf-8") as f:
            f.write(f"User_Q{user_counter}: {user_input.strip()}\n")
            f.write(f"AI_Q{ai_counter_local}: {assistant_message.strip()}\n\n")

        audio2.speak(assistant_message)

    except Exception as e:
        print(f"[ERROR] Gemini error: {e}")
        with open("server/ai_responses_log.txt", "a", encoding="utf-8") as f:
            f.write(f"AI_Q{ai_counter_local}: Error generating response\n\n")

# --- Main Loop ---
try:
    print("[INFO] Gemini Assistant is live and listening continuously...")
    with open("server/ai_responses_log.txt", "w", encoding="utf-8") as f:
        f.write("---- New Session ----\n\n")

    while not stop_requested:
        user_input = audio2.listen()

        if stop_requested:
            break
        if not user_input.strip():
            print("[WARN] No speech detected. Waiting...\n")
            continue
        if playback_lock.locked():
            print("[WAIT] Still speaking... Skipping this round.\n")
            continue

        print(f"[INFO] User said: {user_input}")

        if any(x in user_input.lower() for x in ["quit", "exit", "stop", "end session"]):
            audio2.speak("Ending conversation. Goodbye!")
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