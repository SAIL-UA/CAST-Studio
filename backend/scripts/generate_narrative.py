# backend/scripts/generate_narrative.py

import os
import json
from dotenv import load_dotenv
from datetime import datetime, timezone
import sys
from openai import Client
import re

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise ValueError("API_KEY not found in environment. Make sure .env is set correctly.")

client = Client(api_key=API_KEY)

DATA_PATH = '/data/CAST_ext/users/'

def extract_figure_filenames(sequence_response):
    """
    Extracts figure filenames from the GPT response based on 'Step #' patterns.
    :param sequence_response: The raw sequence response string from GPT.
    :return: A list of filenames.
    """
    # Regex to match '- Step #: filename' pattern
    print(f"The sequence response is {sequence_response}")
    matches = re.findall(r"- Step \d+: `?([\w\-.]+\.(?:png|jpg|jpeg|bmp|tiff))`?", sequence_response)
    print(f"The matches are {matches}")
    return matches

def categorize_figures(description, prompt_cf):
    """
    Categorize figures based on their descriptions using OpenAI API.
    """
    prompt = f"""
### Input
Descriptions of figures: {description}
{prompt_cf}
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
        print(f"Error categorizing figures: {e}")
        return ""

def understand_theme_objective(fig_descriptions, prompt_uto):
    """
    Understand the theme and objective based on figure descriptions using OpenAI API.
    """
    prompt = f"""
### Input
Descriptions of figures: {fig_descriptions}
{prompt_uto}
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
        print(f"Error understanding theme and objective: {e}")
        return ""

def sequence_figures(fig_descriptions_category, theme, prompt_sf):
    """
    Sequence figures based on their descriptions and the identified theme using OpenAI API.
    """
    prompt = f"""
### Input
Descriptions and categories of figures: {fig_descriptions_category}
Topic theme and objective: {theme}
{prompt_sf}
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
        print(f"Error sequencing figures: {e}")
        return ""

def build_story(fig_descriptions_category, sequence, prompt_bs):
    """
    Build a comprehensive story based on figure descriptions and their sequence using OpenAI API.
    """
    prompt = f"""
### Input
Descriptions and categories of figures: {fig_descriptions_category}
Sequence: {sequence}
{prompt_bs}
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
        print(f"Error building story: {e}")
        return ""

def storytelling_pipeline(fig_descriptions_category, prompt_cf, prompt_uto, prompt_sf, prompt_bs):
    """
    Execute the storytelling pipeline: categorize figures, understand theme, sequence figures, and build story.
    """
    # Concatenate all descriptions for theming
    all_descriptions = "\n".join([f"{file}: {info['description']}" for file, info in fig_descriptions_category.items()])

    # Step 1: Categorize figures
    categories = categorize_figures(all_descriptions, prompt_cf)

    # Update fig_descriptions_category with categories
    for idx, (file, info) in enumerate(fig_descriptions_category.items()):
        category = categories.split('\n')[idx].strip() if idx < len(categories.split('\n')) else "Uncategorized"
        fig_descriptions_category[file]['category'] = category

    # Step 2: Understand theme and objective
    theme = understand_theme_objective(all_descriptions, prompt_uto)

    # Step 3: Sequence figures
    sequence = sequence_figures(fig_descriptions_category, theme, prompt_sf)

    # Step 4: Build comprehensive story
    story = build_story(fig_descriptions_category, sequence, prompt_bs)

    return theme, sequence, story

def categorize_figures_individual(fig_descriptions_category, prompt_cf):
    """
    Categorize each figure individually and update the fig_descriptions_category dictionary.
    """
    for file, info in fig_descriptions_category.items():
        description = info['description']
        category = categorize_figures(description, prompt_cf)
        fig_descriptions_category[file]['category'] = category
    return fig_descriptions_category

def generate_story(username, prompt_cf, prompt_uto, prompt_sf, prompt_bs):
    """
    Generate a comprehensive narrative story based on the user's storyboard images and descriptions.
    Additionally, provide a recommended order of figures.
    """
    try:
        base_cache_dir = DATA_PATH
        cache_dir = os.path.join(base_cache_dir, username, "workspace/cache")

        if not os.path.exists(cache_dir):
            print(f"Cache directory does not exist for user '{username}'.")
            return "No storyboard images found.", []

        # Identify JSON files matching image files
        supported_img_exts = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff')
        image_basenames = {
            os.path.splitext(f)[0]
            for f in os.listdir(cache_dir)
            if f.lower().endswith(supported_img_exts)
        }

        fig_descriptions_category = {}
        for f in os.listdir(cache_dir):
            if f.endswith('.json'):
                base_name = os.path.splitext(f)[0]
                if base_name in image_basenames:
                    # Find the actual image file with the matching base name
                    matching_image_file = next(
                        (img for img in os.listdir(cache_dir)
                         if os.path.splitext(img)[0] == base_name and img.lower().endswith(supported_img_exts)),
                        None
                    )
                    if matching_image_file:
                        json_path = os.path.join(cache_dir, f)
                        with open(json_path, 'r') as jf:
                            data = json.load(jf)
                        if data.get('in_storyboard') and data.get('long_desc', '').strip():
                            description = data['long_desc'].strip()
                            category = data.get('category', 'Uncategorized')
                            fig_descriptions_category[matching_image_file] = {
                                "description": description,
                                "category": category
                            }

        if not fig_descriptions_category:
            return "No storyboard images with long descriptions found.", []

        # Generate the narrative
        all_descriptions = "\n".join(
            [f"{file}: {info['description']}" for file, info in fig_descriptions_category.items()]
        )
        theme = understand_theme_objective(all_descriptions, prompt_uto)
        sequence = sequence_figures(fig_descriptions_category, theme, prompt_sf)
        story = build_story(fig_descriptions_category, sequence, prompt_bs)

        # Extract filenames from the sequence
        recommended_order = extract_figure_filenames(sequence)

        return story, recommended_order

    except Exception as e:
        print(f"Error generating narrative: {e}")
        return "An error occurred while generating the narrative.", []


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_narrative.py <username>")
        sys.exit(1)

    username = sys.argv[1]
    user_folder = os.path.join(DATA_PATH, username, 'workspace/cache')

    if not os.path.exists(user_folder):
        print(f"User folder does not exist: {user_folder}")
        sys.exit(1)

    # Load prompts
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
    prompt_files = {
        "categorize_figures": "categorize_figures.txt",
        "understand_theme_objective": "understand_theme_objective.txt",
        "sequence_figures": "sequence_figures.txt",
        "build_story": "build_story.txt"
    }

    prompts = {}
    for key, filename in prompt_files.items():
        prompt_path = os.path.join(prompts_dir, filename)
        if not os.path.exists(prompt_path):
            print(f"Prompt file not found: {prompt_path}")
            sys.exit(1)
        with open(prompt_path, 'r') as file:
            prompts[key] = file.read()

    # Generate narrative and recommended order
    story, recommended_order = generate_story(username, prompts["categorize_figures"],
                                              prompts["understand_theme_objective"],
                                              prompts["sequence_figures"],
                                              prompts["build_story"])

    # Save the narrative to a JSON file
    story_path = os.path.join(user_folder, 'narrative_story.json')
    with open(story_path, 'w') as f:
        json.dump({
            "narrative_story": story,
            "recommended_order": recommended_order
        }, f, indent=2)
    print(f"Narrative story and recommended order generated and saved to '{story_path}'.")

if __name__ == "__main__":
    main()
