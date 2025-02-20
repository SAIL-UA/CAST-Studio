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

########### Vision Capabilities to Understand Images ###########
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

def read_figure_llm(image_path):
    """
    Send the encoded image to GPT-4o to obtain a description.
    """
    base64_image = encode_image(image_path)
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.1,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "generate the description into the paragraph(s) based on this image",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                    },
                ],
            }
        ],
    )
    return response.choices[0].message.content
################################################################

def find_corresponding_image(json_filename, user_folder):
    """
    Given the JSON filename (e.g., 'image123.json'), find an existing image
    with the same base name and a recognized extension inside 'user_folder'.
    Return the full path if found, otherwise None.
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

def process_json_file(json_file, user_folder, prompt_gd):
    """
    Process a single JSON file:
      - Load the JSON data.
      - Find the corresponding image.
      - Send the encoded image to GPT-4o to get a description.
      - If source code is present, combine the image description with the code to generate a long description.
      - Otherwise, use the image description as the long description.
      - Update the JSON file with the new long description and a timestamp.
    """
    json_path = os.path.join(user_folder, json_file)
    with open(json_path, 'r') as f:
        json_data = json.load(f)

    image_path = find_corresponding_image(json_file, user_folder)
    if not image_path:
        print(f"No corresponding image found for '{json_file}', skipping.")
        return None

    # Get image description from GPT-4o
    extracted_info = read_figure_llm(image_path)

    # Check for source code in JSON data
    source = json_data.get('source', '').strip()
    if source:
        fig_info = {
            "text": extracted_info,
            "script": source
        }
        
    else:
        # No source code; use the image description as the long description
        fig_info = {
            "text": extracted_info,
            "script": "no source code included"
        }
    # Generate a long description by sending both the image description and code if available
    description = generate_description(json_file, fig_info, prompt_gd)

    # Update JSON data with the generated description and timestamp
    json_data['long_desc'] = description
    json_data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    with open(json_path, 'w') as f:
        json.dump(json_data, f, indent=2)

    print(f"Updated '{json_file}' with generated description.")
    return description

def update_json_files(username):
    """
    Batch process all figure JSON files for a user.
    """
    print("Batch updating JSON files with generated descriptions...")
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return

    # Load the prompt once for efficiency
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
    prompt_path = os.path.join(prompts_dir, 'generate_description.txt')
    if not os.path.exists(prompt_path):
        print(f"Prompt file not found: {prompt_path}")
        return

    with open(prompt_path, 'r') as prompt_file:
        prompt_gd = prompt_file.read()

    # Process all JSON files in the cache directory
    json_files = [f for f in os.listdir(user_folder) if f.endswith('.json')]
    for json_file in json_files:
        json_path = os.path.join(user_folder, json_file)
        
        # Load the JSON file
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        print(f"{json_file} contents: ")
        # Check if 'longdesc' exists and is not empty
        if 'long_desc' in data and not data['long_desc'].strip():
            process_json_file(json_file, user_folder, prompt_gd)
        else:
            print(f"Skipping {json_file} as 'long_desc' is not empty.")

def update_single_json_file(username, image_id):
    """
    Generate a long description for a single image JSON file identified by image_id.
    """
    print(f"Updating JSON for image_id='{image_id}'")
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return None

    json_file = image_id + '.json'
    json_path = os.path.join(user_folder, json_file)
    if not os.path.exists(json_path):
        print(f"File does not exist for image_id='{image_id}'")
        return None

    # Load the prompt for description generation
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
    prompt_path = os.path.join(prompts_dir, 'generate_description.txt')
    if not os.path.exists(prompt_path):
        print(f"Prompt file not found: {prompt_path}")
        return None

    with open(prompt_path, 'r') as prompt_file:
        prompt_gd = prompt_file.read()

    # Process the JSON file using the common function
    return process_json_file(json_file, user_folder, prompt_gd)

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
