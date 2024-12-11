import os
import json
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

def generate_long_description(source_code):
    """
    Given source code that generated a figure, use OpenAI to generate
    a few-sentence description of what the figure depicts.
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
        "Provide a few sentences describing the resulting figure's content "
        "and insights it conveys."
    )

    try:
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

        # Only proceed if we have source code and no existing long_desc
        if 'source' in data and data['source'].strip():
            # If long_desc is empty or you want to regenerate regardless, adjust condition
            if not data.get('long_desc'):
                source_code = data['source']
                long_desc = generate_long_description(source_code)

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


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_description.py <username>")
        sys.exit(1)

    username = sys.argv[1]
    update_json_files(username)
