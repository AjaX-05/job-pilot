import sys
import os
import traceback
import logging
import re

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

def analyze_problem(image_path, language_hint=None):
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

        lang_instruction = (
            f"\nPlease provide the solution specifically in **{language_hint}**."
            if language_hint else ""
        )

        prompt = (
            "You are a coding expert. Analyze this code problem and provide a detailed solution.\n\n"
            "1. First, clearly identify and explain the programming problem or challenge shown in the image\n"
            "2. Then, provide a step-by-step solution approach\n"
            "3. Finally, give the complete, working code solution with explanatory comments\n\n"
            "Format your response in markdown with:\n"
            "- Problem description under a \"## Problem\" heading\n"
            "- Solution approach under a \"## Approach\" heading\n"
            "- Code under a \"## Solution\" heading with appropriate language syntax highlighting\n"
            f"{lang_instruction}"
        )

        logger.debug("Sending prompt and image to Gemini API...")
        response = client.models.generate_content(
            model=model,
            contents=[prompt, image_part]
        )
        logger.debug("Received response from Gemini API")

        result = response.text.strip()

        # Normalize output to ensure only one ## Solution and one code block
        code_match = re.search(r"```(\w+)?\n(.*?)```", result, re.DOTALL)
        if code_match:
            language = code_match.group(1) or "text"
            code_content = code_match.group(2).strip()

            # Remove all code blocks
            result_wo_code = re.sub(r"```\w*\n.*?```", "", result, flags=re.DOTALL).strip()

            # Avoid repeating ## Solution if it already exists
            if "## Solution" in result_wo_code:
                result_wo_code = re.sub(r"## Solution\s*", "", result_wo_code)

            # Append code section
            result = f"{result_wo_code}\n\n## Solution\n```{language}\n{code_content}\n```"

        logger.debug("Analysis complete")
        return result

    except Exception as e:
        logger.error("Exception occurred:\n%s", traceback.format_exc())
        return f"Error analyzing problem: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python problem_solver.py <image_path> [language]")
        sys.exit(1)
    image = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else None
    result = analyze_problem(image, lang)
    print(result)
