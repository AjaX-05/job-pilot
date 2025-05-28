import os
import time
from flask import Flask, send_file, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOT_PATH = os.path.join(BASE_DIR, "latest_screenshot.png")
DUMMY_TOKEN = "test-token"  # For local dev


def take_screenshot_after_delay():
    if os.getenv("ENABLE_SCREENSHOT", "false").lower() != "true":
        print("[INFO] Screenshot capture disabled by env var.")
        return

    print("[DEBUG] Screenshot thread started.")
    os.environ.setdefault("DISPLAY", ":99")
    print(f"[DEBUG] DISPLAY set to {os.environ['DISPLAY']}")

    time.sleep(2)
    print("[DEBUG] Delay complete, importing pyautogui...")

    try:
        import pyautogui
        print("[DEBUG] pyautogui imported successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to import pyautogui: {e}")
        return

    if os.path.exists(SCREENSHOT_PATH):
        try:
            os.remove(SCREENSHOT_PATH)
            print("[INFO] Old screenshot deleted.")
        except Exception as e:
            print(f"[WARN] Could not delete old screenshot: {e}")

    try:
        print("[DEBUG] Taking screenshot...")
        screenshot = pyautogui.screenshot()
        screenshot.save(SCREENSHOT_PATH)
        print(f"[INFO] Screenshot saved at: {SCREENSHOT_PATH}")
    except Exception as e:
        print(f"[ERROR] Screenshot failed: {e}")


@app.route("/capture", methods=["POST"])
def capture():
    print("[API] /capture called")
    take_screenshot_after_delay()
    return jsonify({"status": "done"})


@app.route("/screenshot", methods=["GET"])
def screenshot():
    print(f"[API] /screenshot called. Looking for: {SCREENSHOT_PATH}")
    if os.path.exists(SCREENSHOT_PATH):
        print("[INFO] Screenshot found, sending file.")
        return send_file(SCREENSHOT_PATH, mimetype='image/png')
    print("[WARN] Screenshot not found.")
    return jsonify({"error": "No screenshot available"}), 404


@app.route("/screenshot/<filename>")
def serve_named_screenshot(filename):
    return send_from_directory(os.path.dirname(SCREENSHOT_PATH), filename)


@app.route("/analyze-problem", methods=["POST"])
def analyze_problem():
    print("[API] /analyze-problem called")
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid authorization header"}), 401

    token = auth_header.split(" ")[1]
    if token != DUMMY_TOKEN:
        return jsonify({"error": "Invalid token"}), 403

    image = request.files.get("image")
    if not image:
        return jsonify({"error": "No image file provided"}), 400

    if not image.mimetype.startswith("image/"):
        return jsonify({
            "error": {
                "code": 400,
                "message": "Provided image is not valid.",
                "status": "INVALID_ARGUMENT"
            }
        }), 400

    language = request.form.get("language", "unknown")
    print(f"[INFO] Image received: {image.filename}, Language: {language}")
    return jsonify({
        "analysis": f"Detected code in {language or 'unknown'} and performed structural review."
    })


if __name__ == "__main__":
    print("[INFO] Starting Flask server...")
    app.run(host="0.0.0.0", port=8123, debug=True)
