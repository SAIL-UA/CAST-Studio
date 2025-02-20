# backend/app.py

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager, login_user, login_required, logout_user, UserMixin
import os
import json
import pam
from datetime import datetime, timezone
import uuid

# Import your script functions
from scripts.generate_description import update_json_files, update_single_json_file
from scripts.generate_narrative import generate_story  # Adjusted import

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a strong secret key
CORS(app, supports_credentials=True)

login_manager = LoginManager()
login_manager.init_app(app)

DATA_PATH = '/data/CAST_ext/users/'
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff'}

class User(UserMixin):
    def __init__(self, username):
        self.id = username

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if authenticate_user(username, password):
        user = User(username)
        login_user(user)
        return jsonify({'status': 'success', 'user': username})
    else:
        return jsonify({'status': 'fail'}), 401

def authenticate_user(username, password):
    pam_auth = pam.pam()
    return pam_auth.authenticate(username, password)

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'status': 'logged out'})

@app.route('/check_auth', methods=['GET'])
def check_auth():
    """
    Check if the user is authenticated.
    Returns: {"authenticated": true/false}
    """
    if '_user_id' in session:
        return jsonify({"authenticated": True})
    return jsonify({"authenticated": False})


@app.route('/get_user_data', methods=['GET'])
@login_required
def get_user_data():
    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')

    if not os.path.exists(user_folder):
        os.makedirs(user_folder)

    # List all image files
    image_files = [f for f in os.listdir(user_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))]

    images_data = []
    for image_file in image_files:
        image_id = os.path.splitext(image_file)[0]
        json_filename = image_id + '.json'
        json_filepath = os.path.join(user_folder, json_filename)

        # Ensure JSON file exists
        if not os.path.exists(json_filepath):
            continue

        # Load JSON data
        with open(json_filepath, 'r') as f:
            image_data = json.load(f)
        image_data['id'] = image_id
        image_data['filename'] = image_file
        images_data.append(image_data)

    return jsonify({'images': images_data})

def allowed_file(filename):
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS

@app.route('/upload_figure', methods=['POST'])
def upload_figure():
    """
    Receives a file from the frontend and saves it to the user's cache folder.
    Also creates a corresponding JSON file with the same basename.
    """
    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    os.makedirs(user_folder, exist_ok=True)

    if 'figure' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part in the request'}), 400

    file = request.files['figure']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        original_filename = file.filename
        # Generate a unique base name for the file
        figure_id = str(uuid.uuid4())
        # Extract the original extension
        ext = os.path.splitext(original_filename)[1]
        # Append the extension to the unique base name
        saved_filename = figure_id + ext

        # Save the image file with the original extension
        filepath = os.path.join(user_folder, saved_filename)
        file.save(filepath)

        # Create a JSON file with the same base name (excluding the extension)
        json_filename = f"{figure_id}.json"
        json_filepath = os.path.join(user_folder, json_filename)

        # Initialize some default JSON structure and include the saved filename in "src"
        image_data = {
            "short_desc":"",
            "long_desc":"",
            "source":"", 
            "in_storyboard": False,
            "x": 0,
            "y": 0,
            "has_order": False,
            "order_num": 0,
            "last_saved": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        }

        with open(json_filepath, 'w') as f:
            json.dump(image_data, f, indent=2)

        return jsonify({'status': 'success', 'message': 'Figure uploaded successfully'})
    else:
        return jsonify({'status': 'error', 'message': 'Unsupported file type'}), 400

@app.route('/delete_figure', methods=['POST'])
@login_required
def delete_figure():
    """
    Expects JSON body with { "filename": "<image_filename>" }
    Deletes the file and its corresponding JSON.
    """
    data = request.get_json()
    filename = data.get('filename')  # e.g. "myplot.png"

    if not filename:
        return jsonify({'status': 'error', 'message': 'No filename provided'}), 400

    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    file_path = os.path.join(user_folder, filename)
    base_name, ext = os.path.splitext(filename)
    json_path = os.path.join(user_folder, base_name + '.json')

    # Remove image file if it exists
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove JSON file if it exists
    if os.path.exists(json_path):
        os.remove(json_path)

    return jsonify({'status': 'success', 'message': 'Figure and JSON deleted successfully'})

@app.route('/images/<filename>')
@login_required
def serve_image(filename):
    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    filepath = os.path.join(user_folder, filename)

    app.logger.debug(f"Requested file: {filepath}")

    if not os.path.exists(filepath):
        app.logger.error(f"File not found: {filepath}")
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(user_folder, filename)

@app.route('/update_image_data', methods=['POST'])
@login_required
def update_image_data():
    data = request.get_json()
    image_id = data.get('id')
    in_storyboard = data.get('in_storyboard')
    x = data.get('x')
    y = data.get('y')
    short_desc = data.get('short_desc')
    long_desc = data.get('long_desc')

    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')
    json_filename = image_id + '.json'
    json_filepath = os.path.join(user_folder, json_filename)

    if os.path.exists(json_filepath):
        with open(json_filepath, 'r') as f:
            image_data = json.load(f)
        # Update the data
        if in_storyboard is not None:
            image_data['in_storyboard'] = in_storyboard
        if x is not None:
            image_data['x'] = x
        if y is not None:
            image_data['y'] = y
        if short_desc is not None:
            image_data['short_desc'] = short_desc
        if long_desc is not None:
            image_data['long_desc'] = long_desc
        image_data['last_saved'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        # Save the JSON file
        with open(json_filepath, 'w') as f:
            json.dump(image_data, f, indent=2)
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'error', 'message': 'JSON file not found'}), 404

@app.route('/run_script', methods=['POST'])
@login_required
def run_script():
    """
    Generate a narrative story, recommended order, and return intermediate GPT outputs.
    Also automatically update the narrative cache with theme, categories, etc.
    """
    try:
        username = session['_user_id']
        prompts_dir = os.path.join(os.path.dirname(__file__), 'prompts')
        prompt_files = {
            "categorize_figures": "categorize_figures.txt",
            "understand_theme_objective": "understand_theme_objective.txt",
            "sequence_figures": "sequence_figures.txt",
            "build_story": "build_story.txt",
        }

        prompts = {}
        for key, filename in prompt_files.items():
            prompt_path = os.path.join(prompts_dir, filename)
            if not os.path.exists(prompt_path):
                raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
            with open(prompt_path, 'r') as file:
                prompts[key] = file.read()

        # Generate story & intermediate outputs
        narrative, recommended_order, categorize_response, theme_response, sequence_response = generate_story(
            username,
            prompts["categorize_figures"],
            prompts["understand_theme_objective"],
            prompts["sequence_figures"],
            prompts["build_story"]
        )

        app.logger.info(f"The recommended order is {recommended_order}")
        print(f"The recommended order is {recommended_order}")

        # Build new cache fields
        new_cache_data = {
            "generated_narrative": narrative,
            "suggested_order": recommended_order,
            "theme": theme_response,
            "categories": categorize_response,
            "sequence_justification": sequence_response
        }

        # Merge into narrative_cache.json
        _merge_narrative_cache(username, new_cache_data)

        # Return final results to frontend
        return jsonify({
            "status": "success",
            "narrative": narrative,
            "recommended_order": recommended_order,
            "categorize_figures_response": categorize_response,
            "theme_response": theme_response,
            "sequence_response": sequence_response
        })

    except Exception as e:
        print(f"Error in run_script: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def _merge_narrative_cache(username, new_data):
    """
    Loads the existing narrative cache for the user (if any),
    merges `new_data` in, and writes it back.
    """
    cache_file = os.path.join(DATA_PATH, username, 'workspace/cache', 'narrative_cache.json')
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                existing_data = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_data = {}
    else:
        existing_data = {}

    # Merge new data into the existing data
    existing_data.update(new_data)

    # Write it back
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(existing_data, f, indent=2)


@app.route('/get_narrative_cache', methods=['GET'])
@login_required
def get_narrative_cache():
    """
    Retrieve the cached narrative JSON.
    """
    username = session['_user_id']
    cache_file = os.path.join(DATA_PATH, username, 'workspace/cache', 'narrative_cache.json')

    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            try:
                data = json.load(f)
                return jsonify({"status": "success", "data": data})
            except json.JSONDecodeError:
                return jsonify({"status": "error", "message": "Cache file is corrupted"}), 500
    else:
        return jsonify({"status": "success", "data": {}})  # Return empty data if the file doesn't exist

@app.route('/update_narrative_cache', methods=['POST'])
@login_required
def update_narrative_cache():
    """
    Merge the posted JSON data with the existing narrative_cache.json,
    rather than overwriting it.
    """
    data = request.get_json()
    username = session['_user_id']
    _merge_narrative_cache(username, data)
    return jsonify({"status": "success"})

@app.route('/clear_narrative_cache', methods=['POST'])
@login_required
def clear_narrative_cache():
    """
    Clear the cached narrative JSON.
    """
    username = session['_user_id']
    cache_file = os.path.join(DATA_PATH, username, 'workspace/cache', 'narrative_cache.json')

    if os.path.exists(cache_file):
        os.remove(cache_file)

    return jsonify({"status": "success"})


# New endpoint to run the generate_description script separately
@app.route('/generate_long_descriptions', methods=['POST'])
@login_required
def generate_long_descriptions():
    username = session['_user_id']
    update_json_files(username)  # This will update all JSON files with long_desc
    return jsonify({'status': 'success', 'message': 'Descriptions generated and JSON files updated.'})

@app.route('/generate_narrative', methods=['POST'])
@login_required
def generate_narrative_route():
    """
    Endpoint to generate the comprehensive narrative story and recommended order.
    """
    username = session['_user_id']
    app.logger.info("Generating narrative for figures")
    narrative, recommended_order = generate_story(username)
    app.logger.info(f"The recommended order is {recommended_order}")
    return jsonify({
        'status': 'success',
        'narrative': narrative,
        'recommended_order': recommended_order
    })

@app.route('/generate_long_description_for_image', methods=['POST'])
@login_required
def generate_long_description_for_image():
    """
    Generate a long description for a single image (card).
    Expects JSON body with { "id": "<image_id>" }.
    """
    data = request.get_json()
    image_id = data.get('id')
    username = session['_user_id']

    if not image_id:
        return jsonify({'status': 'error', 'message': 'No image_id provided'}), 400

    # Call the single-file function
    long_desc = update_single_json_file(username, image_id)

    if long_desc:
        return jsonify({
            'status': 'success',
            'message': f'Long description generated for image {image_id}',
            'long_desc': long_desc
        })
    else:
        # Could be many reasons: file missing, no source, etc.
        return jsonify({
            'status': 'error',
            'message': f'No description generated for image {image_id}'
        }), 400

@app.route('/log_click', methods=['POST'])
@login_required
def log_click():
    """
    Receives click data from the frontend and appends it to 
    /data/CAST_ext/logs/{username}/clickstream_log.json
    """
    data = request.get_json()
    username = session['_user_id']

    # 1. Create the logs directory if it doesn't exist
    logs_dir = os.path.join('/data/CAST_ext/logs', username)
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
        print(f"Made log directory at {logs_dir}")
    else:
        print("Log directory exists")

    # 2. Log file path
    log_file = os.path.join(logs_dir, 'clickstream_log.json')

    # 3. Read existing JSON array or start a new one
    if os.path.exists(log_file):
        try:
            with open(log_file, 'r') as f:
                logs = json.load(f)
        except (json.JSONDecodeError, OSError):
            # If the file is corrupted or empty, start fresh
            logs = []
    else:
        logs = []

    # 4. Create a new entry in the "similar format" you used to have
    # but stored in a JSON-friendly structure.
    new_entry = {
        "Clicked on": data.get('objectClicked', ''),
        "Time": data.get('time', ''),
        "Mouse Down Position": data.get('mouseDownPosition', {}),
        "Mouse Up Position": data.get('mouseUpPosition', {}),
        "Interaction": data.get('interaction', 'unknown')
    }

    # 5. Append to our logs array
    logs.append(new_entry)

    # 6. Write updated logs back to the file in JSON
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)

    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8076)
