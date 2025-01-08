import os
import json
import base64  # Needed for encoding images
from openai import Client
from dotenv import load_dotenv
from datetime import datetime, timezone
import sys

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY not found in environment. Make sure .env is set correctly.")

DATA_PATH = '/data/CAST_ext/users/'

def find_corresponding_image(json_filename, user_folder):
    """
    Given the JSON filename (e.g., 'image123.json'), find an existing image
    with the same base name and a recognized extension (.png, .jpg, .jpeg) 
    inside 'user_folder'. Return the full path if found, otherwise None.
    """
    base_name = os.path.splitext(json_filename)[0]  # e.g. 'image123'
    possible_exts = [".png", ".jpg", ".jpeg"]

    for ext in possible_exts:
        candidate = os.path.join(user_folder, base_name + ext)
        if os.path.exists(candidate):
            return candidate

    return None

def generate_long_description(source_code, image_base64=None):
    """
    Given source code that generated a figure, use OpenAI to generate
    a few-sentence description of what the figure depicts.
    Optionally provide the image in base64 for more context.
    """
    from openai import Client

    # Initialize the client with the API key
    client = Client(api_key=API_KEY)

    prompt = (
        "I will provide you with Python code used to generate a figure, and you will "
        "provide a concise and clear long description (a few sentences) about what the "
        "resulting figure depicts. Do not mention code in your explanation; focus on the "
        "meaning of the resulting visualization.\n\n"
        f"Source code:\n{source_code}\n\n"
    )

    # If we have a base64 image, append it to the prompt
    if False:#image_base64:
        prompt += (
            "The base64-encoded data contains a visual representation of the figure. "
            "Please decode it, analyze the visual details, and incorporate those "
            "observations into your response. \n\n"
            f"Image (base64-encoded):\n\"{image_base64}\"\n\n"
        )

    prompt += (
        "Provide a few sentences describing the resulting figure's content "
        "and insights it conveys."
    )

    try:
        print(prompt)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a data storytelling assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.01,
        )
        # Parse the response correctly
        description = response.choices[0].message.content
        return description.strip()
    except Exception as e:
        print(f"Error generating description: {e}")
        return ""

def update_json_files(username):
    print("Update json files called")
    user_folder = os.path.join(DATA_PATH, username, 'workspace', 'cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return

    # Find all JSON files in the cache directory
    json_files = [f for f in os.listdir(user_folder) if f.endswith('.json')]

    for json_file in json_files:
        json_path = os.path.join(user_folder, json_file)

        with open(json_path, 'r') as f:
            data = json.load(f)

        # Only proceed if we have source code
        if 'source' in data and data['source'].strip():
            # Check if we want to skip if 'long_desc' already exists
            if not data.get('long_desc'):
                source_code = data['source']

                # Find the matching image (same base name). If found, encode it.
                image_path = find_corresponding_image(json_file, user_folder)
                image_base64 = None
                if image_path:
                    try:
                        with open(image_path, 'rb') as img_f:
                            img_data = img_f.read()
                            image_base64 = base64.b64encode(img_data).decode('utf-8')
                    except Exception as e:
                        print(f"Failed to read image for '{json_file}': {e}")

                # Generate description with code + optional base64 image
                long_desc = generate_long_description(source_code, image_base64)

                if long_desc:
                    data['long_desc'] = long_desc
                    data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

                    # Update the JSON file
                    with open(json_path, 'w') as f:
                        json.dump(data, f, indent=2)
                    
                    print(f"Updated '{json_file}' with a generated long description.")
                else:
                    print(f"No description generated for '{json_file}'.")
            else:
                print(f"'{json_file}' already has a long_desc, skipping.")
        else:
            print(f"No source code in '{json_file}' or unable to process.")

def update_single_json_file(username, image_id):
    """
    Generates a long_desc for a single image JSON file (identified by image_id).
    This mirrors update_json_files but only for one file.
    """
    print(f"Updating JSON for image_id='{image_id}'")

    user_folder = os.path.join(DATA_PATH, username, 'workspace', 'cache')
    if not os.path.exists(user_folder):
        print(f"No cache folder found for user '{username}'.")
        return None  # Return something to indicate no update

    # The JSON file for this image
    json_file = image_id + '.json'
    json_path = os.path.join(user_folder, json_file)

    if not os.path.exists(json_path):
        print(f"File does not exist for image_id='{image_id}'")
        return None

    with open(json_path, 'r') as f:
        data = json.load(f)

    if 'source' in data and data['source'].strip():
        source_code = data['source']

        # Find the matching image (same base name). If found, encode it.
        image_path = find_corresponding_image(json_file, user_folder)
        image_base64 = None
        if image_path:
            try:
                with open(image_path, 'rb') as img_f:
                    img_data = img_f.read()
                    image_base64 = base64.b64encode(img_data).decode('utf-8')
            except Exception as e:
                print(f"Failed to read image for '{json_file}': {e}")

        # Generate the long_desc
        long_desc = generate_long_description(source_code, image_base64)
        if long_desc:
            data['long_desc'] = long_desc
            data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

            # Update the JSON file
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=2)

            print(f"Updated '{json_file}' with a generated long description.")
            return long_desc
        else:
            print(f"No description generated for '{json_file}'.")
            return None
    else:
        print(f"No source code in '{json_file}' or unable to process.")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_description.py <username>")
        sys.exit(1)

    username = sys.argv[1]
    update_json_files(username)
