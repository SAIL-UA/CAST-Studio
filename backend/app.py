from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager, login_user, login_required, logout_user, UserMixin
import os
import json
import pam
from datetime import datetime, timezone

# Import your script function
from scripts.generate_description import update_json_files, update_single_json_file
from scripts.generate_narrative import generate_story

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a strong secret key
CORS(app, supports_credentials=True)

login_manager = LoginManager()
login_manager.init_app(app)

DATA_PATH = '/data/CAST_ext/users/'

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

@app.route('/get_user_data', methods=['GET'])
@login_required
def get_user_data():
    username = session['_user_id']
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')

    if not os.path.exists(user_folder):
        os.makedirs(user_folder)

    # List all image files
    image_files = [f for f in os.listdir(user_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

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
            json.dump(image_data, f)
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'error', 'message': 'JSON file not found'}), 404

@app.route('/run_script', methods=['POST'])
@login_required
def run_script():
    username = session['_user_id']
    story = generate_story(username)
    return jsonify({'status': 'success', 'output': story})

# New endpoint to run the generate_description script
@app.route('/generate_long_descriptions', methods=['POST'])
@login_required
def generate_long_descriptions():
    username = session['_user_id']
    update_json_files(username)  # This will update all JSON files with long_desc
    return jsonify({'status': 'success', 'message': 'Descriptions generated and JSON files updated.'})

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
        print(f"made log at {logs_dir}")
    else:
        print("log exists")

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
        "Mouse Up Position": data.get('mouseUpPosition', {})
    }

    # 5. Append to our logs array
    logs.append(new_entry)

    # 6. Write updated logs back to the file in JSON
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)

    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8076)
