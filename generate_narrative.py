from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")

def generate_story(username):
    # OpenAI API Key
    client = OpenAI(
        api_key=API_KEY,
    )

    # Define base directory for the cache
    base_cache_dir = '/data/CAST_ext/users/'
    cache_dir = os.path.join(base_cache_dir, username, "workspace/cache")

    # Load prompt and data_insights
    with open(os.path.join(cache_dir, "figure_description.txt"), "r") as file:
        data_insights = file.read()

    with open("./prompts/step_identification of story.txt", "r") as file:
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
    with open("./prompts/step_align data insights.txt", "r") as file:
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

    # Step 3: Generate Coherent Narrative
    with open("./prompts/step_generate story.txt", "r") as file:
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
