import sys
import os
import traceback
import logging

try:
    import google.genai as genai
    from google.genai import types
except ImportError as e:
    print("[ERROR] google-genai is not installed:", e)
    sys.exit(1)

# Configure logger
logging.basicConfig(
    level=logging.WARNING,  # Change to logging.DEBUG for troubleshooting
    format="[%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

def analyze_problem(image_path):
    logger.debug("Starting analysis")
    API_KEY = os.getenv('GEMINI_API_KEY')
    if not API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set.")
        return "Error: GEMINI_API_KEY environment variable not set."

    try:
        logger.debug("Creating Gemini client")
        client = genai.Client(api_key=API_KEY)
        model = "gemini-2.0-flash-001"
        logger.debug(f"Using model: {model}")

        logger.debug(f"Loading image from: {image_path}")
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
        logger.debug("Image loaded and wrapped as Part")

        prompt = (
            "You are a coding expert. Analyze this code problem and provide a detailed solution.\n\n"
            "1. First, clearly identify and explain the programming problem or challenge shown in the image\n"
            "2. Then, provide a step-by-step solution approach\n"
            "3. Finally, give the complete, working code solution with explanatory comments\n\n"
            "Format your response in markdown with:\n"
            "- Problem description under a \"## Problem\" heading\n"
            "- Solution approach under a \"## Approach\" heading\n"
            "- Code under a \"## Solution\" heading with appropriate language syntax highlighting\n"
        )

        logger.debug("Sending prompt and image to Gemini API...")
        response = client.models.generate_content(
            model=model,
            contents=[prompt, image_part]
        )
        logger.debug("Received response from Gemini API")

        result = response.text.strip()
        if not result.startswith('##'):
            result = f"## Analysis\n\n{result}"
        logger.debug("Analysis complete")
        return result

    except Exception as e:
        logger.error("Exception occurred:\n%s", traceback.format_exc())
        return f"Error analyzing problem: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python problem_solver.py <image_path>")
        sys.exit(1)
    result = analyze_problem(sys.argv[1])
    print(result)
