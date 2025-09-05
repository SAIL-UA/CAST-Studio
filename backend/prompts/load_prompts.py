# load in prompts once at startup

with open("prompts/categorize_figures.txt", "r") as f:
  categorize_figs_prompt = f.read()

with open("prompts/understand_theme_objective.txt", "r") as f:
  theme_objective_prompt = f.read()

with open("prompts/sequence_figures.txt", "r") as f:
  sequence_figs_prompt = f.read()

with open("prompts/build_story.txt", "r") as f:
  build_story_prompt = f.read()
  
with open("prompts/generate_description.txt", "r") as f:
  generate_desc_prompt = f.read()