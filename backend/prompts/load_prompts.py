# load in prompts once at startup

with open("categorize_figures.txt", "r") as f:
  categorize_figs_prompt = f.read()

with open("understand_theme_objective.txt", "r") as f:
  theme_objective_prompt = f.read()

with open("sequence_figures.txt", "r") as f:
  sequence_figs_prompt = f.read()

with open("build_story.txt", "r") as f:
  build_story_prompt = f.read()
  
with open("generate_description.txt", "r") as f:
  generate_desc_prompt = f.read()