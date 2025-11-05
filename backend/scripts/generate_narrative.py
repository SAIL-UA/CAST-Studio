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
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    raise ValueError("API_KEY not found in environment. Make sure .env is set correctly.")

client = Client(api_key=API_KEY)

DATA_PATH = os.getenv("DATA_PATH")

def load_story_structures():
    """
    Load story structures from the story_definition.txt file.
    Parses the markdown format and extracts structure information.
    
    Returns:
        dict: Dictionary of story structures with their details
    """
    
    structures = {}
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts')
    story_def_path = os.path.join(prompts_dir, 'story_definition.txt')
    
    # Mapping of full names to IDs
    name_to_id = {
        "Time-Based Progression": "time_based",
        "Overview to Detail": "overview_to_detail", 
        "Cause-and-Effect": "cause_and_effect",
        "Workflow/Process": "workflow_process",
        "Comparative Analysis": "comparative",
        "Thematic Clustering": "thematic_clustering",
        "Problem-Solution Framework": "problem_solution",
        "Question-and-Answer": "question_answer"
    }
    
    # Sequence approach patterns for each structure
    sequence_approaches = {
        "time_based": "Arrange figures chronologically to show evolution: Start with initial conditions → intermediate stages → current outcomes.",
        "overview_to_detail": "Start with high-level summaries and then zoom into specific details: Total overview → breakdown by category → specific details.",
        "cause_and_effect": "Order figures to illustrate causal relationships: Show the cause → show the effect → demonstrate the relationship.",
        "workflow_process": "Arrange figures to reflect analytical process steps: Raw data → processing steps → final results.",
        "comparative": "Start with comparisons, then move to insights: Direct comparison → detailed differences → conclusions or trade-offs.",
        "thematic_clustering": "Group figures by theme: Theme 1 figures → Theme 2 figures → Theme 3 figures → synthesis.",
        "problem_solution": "Follow problem-solving arc: Define the problem → diagnose root causes → present solution and impact.",
        "question_answer": "Build investigative narrative: Pose the question → explore drivers/evidence → provide the answer."
    }
    
    try:
        with open(story_def_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split by ### headers to get each structure section
        sections = re.split(r'^###\s+\d+\.\s+', content, flags=re.MULTILINE)[1:]
        
        for section in sections:
            lines = section.strip().split('\n')
            if not lines:
                continue
            
            # Extract name from the first line (header)
            header_match = re.match(r'^(.+?)\s*(?:\([^)]+\))?\s*$', lines[0])
            if not header_match:
                continue
                
            full_name = header_match.group(1).strip()
            
            # Get the ID from our mapping
            structure_id = name_to_id.get(full_name)
            if not structure_id:
                continue
            
            # Extract description - look for the line starting with **Description**:
            description = ""
            for i, line in enumerate(lines):
                if line.startswith('**Description**:'):
                    # Get the description text after the label
                    desc_text = line[len('**Description**:'):].strip()
                    # Remove markdown formatting
                    desc_text = re.sub(r'\*\*(.+?)\*\*', r'\1', desc_text)  # Remove bold
                    desc_text = re.sub(r'\*(.+?)\*', r'\1', desc_text)  # Remove italics
                    description = desc_text
                    break
            
            # If no description found in the expected format, try to extract from content
            if not description and len(lines) > 1:
                for line in lines[1:]:
                    if line.strip() and not line.startswith('**Trend Example'):
                        description = re.sub(r'\*\*(.+?)\*\*', r'\1', line.strip())
                        description = re.sub(r'\*(.+?)\*', r'\1', description)
                        break
            
            structures[structure_id] = {
                "name": full_name,
                "description": description,
                "sequence_approach": sequence_approaches.get(structure_id, "")
            }
    
    except Exception as e:
        print(f"Warning: Could not load story structures from file: {e}")
        print("Falling back to default structures...")
        # Fallback to a basic set of structures if file loading fails
        return {
            "time_based": {
                "name": "Time-Based Progression",
                "description": "Arranges visualizations chronologically to show change, growth, or evolution over time.",
                "sequence_approach": "Arrange figures chronologically to show evolution."
            },
            "overview_to_detail": {
                "name": "Overview to Detail",
                "description": "Begins with high-level summary and progressively drills down into specific details.",
                "sequence_approach": "Start with high-level summaries and then zoom into details."
            }
        }
    
    return structures

# Load story structures from file at module initialization
STORY_STRUCTURES = load_story_structures()

def select_story_structure(structure_id=None):
    """
    Select a story structure based on user preference or return default.
    
    Args:
        structure_id (str, optional): The ID of the desired story structure.
                                     If None, returns None to use automatic selection.
    
    Returns:
        dict: The selected story structure with its details, or None for automatic selection.
    """
    if structure_id is None:
        return None
    
    if structure_id in STORY_STRUCTURES:
        return STORY_STRUCTURES[structure_id]
    else:
        # If invalid structure_id, return None for automatic selection
        print(f"Warning: Invalid story structure ID '{structure_id}'. Using automatic selection.")
        return None

def get_available_structures():
    """
    Get a list of available story structures for user selection.
    
    Returns:
        list: List of dictionaries containing structure IDs and names.
    """
    return [{"id": key, "name": value["name"], "description": value["description"]} 
            for key, value in STORY_STRUCTURES.items()]

def categorize_figure(description, prompt_cf):
    """
    Categorize a single figure based on its description using the OpenAI API.
    Returns a string (the category) or an empty string on error.
    """
    prompt = f"""
    ### Input
    This is a single figure description:
    {description}

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
        print(f"Error categorizing figure: {e}")
        return ""

def categorize_all_figures_batch(fig_descriptions_dict, prompt_cf):
    """
    Categorize all figures in a single API call to reduce latency.
    Returns a dictionary mapping filenames to categories.
    """
    if not fig_descriptions_dict:
        return {}
    
    # Build a single prompt for all figures
    figures_text = "\n\n".join([
        f"[Figure {i+1}] Filename: {file}\nDescription: {info['description']}"
        for i, (file, info) in enumerate(fig_descriptions_dict.items())
    ])
    
    prompt = f"""
    Please categorize each of the following figures based on their descriptions.
    
    For each figure, provide a category following this exact format:
    [Figure X] Filename: category_here
    
    Figures to categorize:
    {figures_text}
    
    {prompt_cf}
    
    Please provide the categories in the format specified above, one per line.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that categorizes figures. Follow the exact format requested."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse the response to extract categories
        categories = {}
        lines = response_text.split('\n')
        
        # Create a mapping of figure numbers to filenames
        file_list = list(fig_descriptions_dict.keys())
        
        for line in lines:
            # Try to parse lines like "[Figure X] Filename: category"
            if '[Figure' in line and ']' in line:
                try:
                    # Extract figure number
                    fig_num_match = re.search(r'\[Figure (\d+)\]', line)
                    if fig_num_match:
                        fig_num = int(fig_num_match.group(1)) - 1  # Convert to 0-based index
                        if 0 <= fig_num < len(file_list):
                            # Extract category (everything after the last colon)
                            if ':' in line:
                                parts = line.split(':', 1)
                                if len(parts) > 1:
                                    category = parts[-1].strip()
                                    filename = file_list[fig_num]
                                    categories[filename] = category
                except Exception as e:
                    print(f"Error parsing line '{line}': {e}")
                    continue
        
        # Ensure all files have a category (fallback to "Uncategorized" if missing)
        for file in fig_descriptions_dict.keys():
            if file not in categories:
                print(f"Warning: No category found for {file}, using 'Uncategorized'")
                categories[file] = "Uncategorized"
        
        return categories
        
    except Exception as e:
        print(f"Error in batch categorization: {e}")
        # Fallback to individual categorization if batch fails
        print("Falling back to individual categorization...")
        categories = {}
        for file, info in fig_descriptions_dict.items():
            categories[file] = categorize_figure(info["description"], prompt_cf)
        return categories

def extract_figure_filenames(sequence_response):
    """
    Extracts figure filenames from the GPT response based on 'Step #' patterns.
    :param sequence_response: The raw sequence response string from GPT.
    :return: A list of filenames.
    """
    print(f"The sequence response is: {sequence_response}")

    # Regex pattern with optional bold markers (i.e. **)
    pattern = r"- Step \d+: (?:\*\*|`)?([\w\-.]+\.(?:png|jpg|jpeg|bmp|tiff))(?:\*\*|`)?"
    matches = re.findall(pattern, sequence_response)
    
    print(f"The matches are: {matches}")
    return matches

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

def sequence_figures(fig_descriptions_category, theme, prompt_sf, selected_structure=None):
    """
    Sequence figures based on their descriptions and the identified theme using OpenAI API.
    If a structure is selected, use only that structure for sequencing.
    """
    if selected_structure:
        # Modify the prompt to use only the selected structure
        structure_prompt = f"""
        ### Selected Story Structure: {selected_structure['name']}
        
        {selected_structure['description']}
        
        Sequencing Approach: {selected_structure['sequence_approach']}
        
        Please sequence the figures according to this specific storytelling structure.
        """
        prompt = f"""
        ### Input
        Descriptions and categories of figures: {fig_descriptions_category}
        Topic theme and objective: {theme}
        
        {structure_prompt}
        
        ### Output Format:
        1. **Chosen Storytelling Structure**: {selected_structure['name']}
        2. **Sequence of Figures**:
           - Step 1: [Figure Name]
           - Step 2: [Figure Name]
           - Step 3: [Figure Name]
           (...continue as needed)
        3. **Justification**:
           - Explain how this sequence follows the {selected_structure['name']} structure and effectively communicates the intended story.
        """
    else:
        # Use the original prompt for automatic selection
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

def build_story(fig_descriptions_category, sequence, prompt_bs, selected_structure=None):
    """
    Build a comprehensive story based on figure descriptions and their sequence using OpenAI API.
    If a structure was selected, explain how the story follows that structure.
    """
    if selected_structure:
        structure_context = f"""
        ### Story Structure Context:
        This story follows the **{selected_structure['name']}** structure.
        
        Structure Description: {selected_structure['description']}
        
        Please build the comprehensive story following this structure, and explicitly mention in the introduction 
        how the narrative follows the {selected_structure['name']} approach.
        """
    else:
        structure_context = ""
    
    prompt = f"""
    ### Input
    Descriptions and categories of figures: {fig_descriptions_category}
    Sequence: {sequence}
    
    {structure_context}
    
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

def embed_figures_in_story(story_text, cache_dir, output_format="markdown"):
    """
    Process the story text to convert figure placeholders to appropriate format.
    
    Args:
        story_text (str): Story text with [FIGURE: filename] placeholders
        cache_dir (str): Directory containing the figure files
        output_format (str): Format for figure embedding ("markdown" or "html")
    
    Returns:
        tuple: (story_with_figures, figure_paths)
            - story_with_figures: Story with properly formatted figure references
            - figure_paths: Dictionary mapping filenames to full paths
    """
    import re
    
    # Find all figure placeholders in the story
    figure_pattern = r'\[FIGURE:\s*([^\]]+)\]'
    figure_matches = re.findall(figure_pattern, story_text)
    
    figure_paths = {}
    story_with_figures = story_text
    
    for filename in figure_matches:
        filename = filename.strip()
        full_path = os.path.join(cache_dir, filename)
        
        # Store the path for reference
        figure_paths[filename] = full_path
        
        # Replace placeholder with appropriate format
        if output_format == "html":
            # HTML format with image tag
            replacement = f'<figure><img src="/api/images/{filename}" alt="{filename}" style="max-width: 100%; height: auto;"><figcaption>{filename}</figcaption></figure>'
        else:
            # Markdown format
            replacement = f'\n\n![{filename}]({filename})\n\n'
        
        # Replace the placeholder with the formatted figure reference
        placeholder = f'[FIGURE: {filename}]'
        story_with_figures = story_with_figures.replace(placeholder, replacement)
    
    return story_with_figures, figure_paths

def generate_story(username, prompt_cf, prompt_uto, prompt_sf, prompt_bs, story_structure_id=None):
    """
    Generate a comprehensive narrative story based on the user's storyboard images and descriptions.
    Additionally, provide a recommended order of figures.
    
    Args:
        username (str): The username for identifying the user's workspace
        prompt_cf (str): Prompt for categorizing figures
        prompt_uto (str): Prompt for understanding theme/objective
        prompt_sf (str): Prompt for sequencing figures
        prompt_bs (str): Prompt for building story
        story_structure_id (str, optional): ID of the story structure to use. If None, automatic selection.
    
    Returns:
       story (str): The final narrative story with embedded figures.
       story_text_only (str): The narrative story without figure embedding.
       recommended_order (list): List of filenames in recommended order.
       categories_string (str): Figure categories as a single formatted string.
       theme (str): The theme text.
       sequence (str): The sequence justification.
       selected_structure_name (str): Name of the structure used (or "Automatic" if none selected).
       figure_paths (dict): Dictionary mapping figure filenames to their full paths.
    """
    try:
        base_cache_dir = DATA_PATH
        cache_dir = os.path.join(base_cache_dir, username, "workspace/cache")

        if not os.path.exists(cache_dir):
            print(f"Cache directory does not exist for user '{username}'.")
            return "No storyboard images found.", [], "", "", ""

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
                            fig_descriptions_category[matching_image_file] = {
                                "description": description
                            }

        if not fig_descriptions_category:
            return "No storyboard images with long descriptions found.", [], "", "", "", "None"
        
        # Select story structure if specified
        selected_structure = select_story_structure(story_structure_id)
        selected_structure_name = selected_structure['name'] if selected_structure else "Automatic Selection"
        
        # OPTIMIZED: Batch categorize all figures at once to reduce API calls
        print(f"Categorizing {len(fig_descriptions_category)} figures in a single batch...")
        categories = categorize_all_figures_batch(fig_descriptions_category, prompt_cf)
        
        # Apply the categories to each figure
        for file in fig_descriptions_category.keys():
            fig_descriptions_category[file]["category"] = categories.get(file, "Uncategorized")
        
        categories_string = "\n".join(
            [f"- **{file}**: {info['category']}" for file, info in fig_descriptions_category.items()]
        )

        # Combine all descriptions for theming
        all_descriptions = "\n".join(
            [f"{file}: {info['description']}" for file, info in fig_descriptions_category.items()]
        )

        # Get theme and sequence justification with selected structure
        theme = understand_theme_objective(all_descriptions, prompt_uto)
        sequence = sequence_figures(fig_descriptions_category, theme, prompt_sf, selected_structure)
        story_text_only = build_story(fig_descriptions_category, sequence, prompt_bs, selected_structure)

        # Extract recommended order
        recommended_order = extract_figure_filenames(sequence)
        
        # Embed figures in the story
        story_with_figures, figure_paths = embed_figures_in_story(story_text_only, cache_dir, "markdown")

        return story_with_figures, story_text_only, recommended_order, categories_string, theme, sequence, selected_structure_name, figure_paths

    except Exception as e:
        print(f"Error generating narrative: {e}")
        return "An error occurred while generating the narrative.", "An error occurred while generating the narrative.", [], "", "", "", "None", {}
    
def merge_narrative_cache(user_folder, new_cache_data):
    """
    Merge new cache data into the existing narrative cache.
    """
    cache_file = os.path.join(user_folder, 'narrative_cache.json')
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                existing_data = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_data = {}
    else:
        existing_data = {}

    # Merge new data into the existing data
    existing_data.update(new_cache_data)

    # Write it back
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(existing_data, f, indent=2)
    



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

    # Generate narrative and recommended order (with automatic structure selection)
    story, story_text_only, recommended_order, _, _, _, _, figure_paths = generate_story(username, prompts["categorize_figures"],
                                                                                         prompts["understand_theme_objective"],
                                                                                         prompts["sequence_figures"],
                                                                                         prompts["build_story"])

    # Save the narrative to a JSON file
    story_path = os.path.join(user_folder, 'narrative_story.json')
    with open(story_path, 'w') as f:
        json.dump({
            "narrative_story": story,
            "narrative_story_text_only": story_text_only,
            "recommended_order": recommended_order,
            "figure_paths": figure_paths
        }, f, indent=2)
    print(f"Narrative story (with embedded figures) and recommended order generated and saved to '{story_path}'.")

if __name__ == "__main__":
    main()
