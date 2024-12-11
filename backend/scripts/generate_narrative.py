import os
import json
from dotenv import load_dotenv
from datetime import datetime, timezone
import sys
from openai import Client

load_dotenv()
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise ValueError("API_KEY not found in environment. Make sure .env is set correctly.")

def generate_story(username):
    # Initialize the client with the API key
    client = Client(api_key=API_KEY)

    # Define base directory for the cache
    base_cache_dir = '/data/CAST_ext/users/'
    cache_dir = os.path.join(base_cache_dir, username, "workspace/cache")

    # Identify all JSON files that have corresponding image files with the same base name
    # and collect their long_desc if conditions are met (in_storyboard=true and long_desc not blank)
    supported_img_exts = ('.png', '.jpg', '.jpeg')
    image_basenames = set()
    
    # Collect image basenames
    for f in os.listdir(cache_dir):
        if f.lower().endswith(supported_img_exts):
            image_basenames.add(os.path.splitext(f)[0])

    data_insights_list = []

    # Now iterate over JSON files and match with image basenames
    for f in os.listdir(cache_dir):
        if f.endswith('.json'):
            base_name = os.path.splitext(f)[0]
            if base_name in image_basenames:
                json_path = os.path.join(cache_dir, f)
                with open(json_path, 'r') as jf:
                    data = json.load(jf)
                # Check conditions: in_storyboard == True and long_desc not blank
                if data.get('in_storyboard') and data.get('long_desc', '').strip():
                    long_desc = data['long_desc'].strip()
                    # Add this long_desc to our data_insights_list
                    data_insights_list.append(long_desc)

    # Combine all selected long_descriptions into one data_insights string
    data_insights = "\n\n".join(data_insights_list)

    # If no insights found, handle gracefully
    if not data_insights:
        data_insights = "No storyboard images with long descriptions found."

    # Load prompts
    with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "step_identification of story.txt"), "r") as file:
        prompt_2 = file.read()

    # Step 1: Determining the central research topic
    def identify_main_narrative(prompt_2, data_insights):
        prompt = f"""
        {prompt_2}

        Data Insights: {data_insights}
        """
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.01
        )
        return response.choices[0].message.content

    research_topic = identify_main_narrative(prompt_2, data_insights)

    # Step 2: Generate Ordered Sequence of Data Insights
    with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "step_align data insights.txt"), "r") as file:
        prompt_4 = file.read()

    def match_and_order_data_insights(prompt_4, data_insights, research_topic):
        prompt = f"""
        {prompt_4}

        Research_topic: {research_topic}
        Data Insights: {data_insights}
        """
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.01
        )
        return response.choices[0].message.content

    ordered_insights = match_and_order_data_insights(prompt_4, data_insights, research_topic)
    # print(f"the ordered insights are {ordered_insights}")

    # Step 3: Generate Coherent Narrative
    with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "step_generate story.txt"), "r") as file:
        prompt_5 = file.read()

    def generate_narrative(prompt_5, ordered_insights, data_insights):
        prompt = f"""
        {prompt_5}

        Ordered Insights: {ordered_insights}
        Data Insights: {data_insights}
        """
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.01
        )
        return response.choices[0].message.content

    narrative_story = generate_narrative(prompt_5, ordered_insights, data_insights)
    return narrative_story
