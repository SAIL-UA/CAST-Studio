# backend/scripts/generate_description.py

import os
import json
import base64  # Needed for encoding images
from openai import Client
from dotenv import load_dotenv
from datetime import datetime, timezone
import cv2
import pytesseract
import sys

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise ValueError("API_KEY not found in environment. Make sure .env is set correctly.")

client = Client(api_key=API_KEY)

DATA_PATH = '/data/CAST_ext/users/'

def is_image_file(filename):
    """
    Check if a file is an image based on its extension.
    """
    valid_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff')
    return filename.lower().endswith(valid_extensions)

def is_script_file(filename):
    """
    Check if a file is a JSON script file.
    """
    return filename.lower().endswith('.json')  # Adjusted to JSON

def extract_text_from_image(image_path):
    """
    Use OpenCV and pytesseract to extract text from the given image.
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            print(f"Failed to read image: {image_path}")
            return ""
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply threshold to get binary image
        _, binary_image = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        # Detect contours to check if it's a compound figure
        contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Store detected regions of interest (ROIs)
        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter small contours by size
            if w * h > 100:
                regions.append((x, y, w, h))

        # Use OCR to extract any text found in the image
        detected_text = pytesseract.image_to_string(image)

        # Combine extracted text and caption
        detected_info = f"Detected Text: {detected_text}\n"
        if len(regions) > 1:
            detected_info += "Detected multiple sub-regions, possibly a compound figure.\n"
        else:
            detected_info += "Single figure detected.\n"

        return detected_info
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return ""

def find_corresponding_image(json_filename, user_folder):
    """
    Given the JSON filename (e.g., 'image123.json'), find an existing image
    with the same base name and a recognized extension (.png, .jpg, .jpeg, .bmp, .tiff) 
    inside 'user_folder'. Return the full path if found, otherwise None.
    """
    base_name = os.path.splitext(json_filename)[0]  # e.g., 'image123'
    possible_exts = [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]

    for ext in possible_exts:
        candidate = os.path.join(user_folder, base_name + ext)
        if os.path.exists(candidate):
            return candidate

    return None

def generate_description(file, info, prompt_gd):
    """
    Generate a description for a figure using the OpenAI API.
    """
    prompt = f"""
### Input
Figure Name: {file}
Extracted Information: {info['text']}
Related Code Script: {info['script']}
{prompt_gd}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating description for {file}: {e}")
        return ""

def update_json_files(username):
    """
    Batch process all figures for a user to generate and update descriptions.
    """
    print("Batch updating JSON files with generated descriptions...")
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return

    # Find all JSON files in the cache directory
    json_files = [f for f in os.listdir(user_folder) if f.endswith('.json')]

    for json_file in json_files:
        json_path = os.path.join(user_folder, json_file)
        image_path = find_corresponding_image(json_file, user_folder)

        if not image_path:
            print(f"No corresponding image found for '{json_file}', skipping.")
            continue

        extracted_info = extract_text_from_image(image_path)

        with open(json_path, 'r') as script_file:
            json_data = json.load(script_file)
            script_content = json_data.get('source', "No associated source code found.")

        fig_info = {
            "text": extracted_info,
            "script": script_content if script_content else "No associated script found."
        }

        # Load prompt for description generation
        prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
        prompt_path = os.path.join(prompts_dir, 'generate_description.txt')
        if not os.path.exists(prompt_path):
            print(f"Prompt file not found: {prompt_path}")
            continue

        with open(prompt_path, 'r') as prompt_file:
            prompt_gd = prompt_file.read()

        # Generate description
        description = generate_description(json_file, fig_info, prompt_gd)

        # Update JSON data with the generated description
        json_data['long_desc'] = description
        json_data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # Save the updated JSON file
        with open(json_path, 'w') as f:
            json.dump(json_data, f, indent=2)

        print(f"Updated '{json_file}' with generated description.")

def update_single_json_file(username, image_id):
    """
    Generate a long description for a single image JSON file identified by image_id.
    """
    print(f"Updating JSON for image_id='{image_id}'")
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return None  # Indicate no update

    # The JSON file for this image
    json_file = image_id + '.json'
    json_path = os.path.join(user_folder, json_file)

    if not os.path.exists(json_path):
        print(f"File does not exist for image_id='{image_id}'")
        return None

    with open(json_path, 'r') as f:
        json_data = json.load(f)

    # Only proceed if we have source code
    if 'source' in json_data and json_data['source'].strip():
        # Check if we want to skip if 'long_desc' already exists
        image_path = find_corresponding_image(json_file, user_folder)
        if not image_path:
            print(f"No corresponding image found for '{json_file}', skipping.")
            return None

        # Extract text from the image
        extracted_info = extract_text_from_image(image_path)

        fig_info = {
            "text": extracted_info,
            "script": json_data.get('source', "No associated source code found.")
        }

        # Load prompt for description generation
        prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
        prompt_path = os.path.join(prompts_dir, 'generate_description.txt')
        if not os.path.exists(prompt_path):
            print(f"Prompt file not found: {prompt_path}")
            return None

        with open(prompt_path, 'r') as prompt_file:
            prompt_gd = prompt_file.read()

        # Generate description
        description = generate_description(json_file, fig_info, prompt_gd)

        if description:
            json_data['long_desc'] = description
            json_data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

            # Save the updated JSON file
            with open(json_path, 'w') as f:
                json.dump(json_data, f, indent=2)

            print(f"Updated '{json_file}' with generated description.")
            return description
        else:
            print(f"No description generated for '{json_file}'.")
            return None
    else:
        print(f"No source code in '{json_file}' or unable to process.")
        return None

def main():
    """
    Main function to handle command-line arguments for batch or single image processing.
    Usage:
        python generate_description.py <username> [<image_id>]
    If <image_id> is provided, only that image's description is generated.
    Otherwise, all applicable images for the user are processed.
    """
    if len(sys.argv) < 2:
        print("Usage: python generate_description.py <username> [<image_id>]")
        sys.exit(1)

    username = sys.argv[1]
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')

    if not os.path.exists(user_folder):
        print(f"User folder does not exist: {user_folder}")
        sys.exit(1)

    if len(sys.argv) == 3:
        # Single image processing
        image_id = sys.argv[2]
        description = update_single_json_file(username, image_id)
        if description:
            print(f"Generated description for image '{image_id}':\n{description}")
        else:
            print(f"Failed to generate description for image '{image_id}'.")
    else:
        # Batch processing
        update_json_files(username)

if __name__ == "__main__":
    main()
