# File to pydandtic models for API client responses / structured outputs
# Also includes json mapping structures conerted to pydantic objects

# Import dependencies
from pydantic import BaseModel
from typing import Literal

# Story structure id -> number, name, filename, description, valid_group_numbers
# NOTE: filename expects paths relative to the prompts/ dir for use in the _load_prompt function
STORY_SCAFFOLDS = {
    "cause_and_effect": {
        "id": "cause_and_effect",
        "name": "Cause and Effect",
        "filename": "unique_stories/3_cause_and_effect.txt",
        "number": 1,
        "description": "How a variable or event influences another.",
        "valid_group_numbers": [1, 2],  # 1=causes, 2=effects
    },
    "question_answer": {
        "id": "question_answer",
        "name": "Question and Answer",
        "filename": "unique_stories/8_question_and_answer.txt",
        "number": 2,
        "description": "A central question, followed by evidence to support the answer.",
        "valid_group_numbers": [1, 2],  # 1=question, 2=answer
    },
    "time_based": {
        "id": "time_based",
        "name": "Timeline",
        "filename": "unique_stories/1_time_based_progression.txt",
        "number": 3,
        "description": "A sequence of events in time to highlight patterns and trends.",
        "valid_group_numbers": [1, 2, 3, 4],  # 1=event 1, 2=event 2, 3=event 3, 4=event 4
    },
    "factor_analysis": {
        "id": "factor_analysis",
        "name": "Factor Analysis",
        "filename": "unique_stories/6_thematic_clustering.txt",
        "number": 4,
        "description": "A breakdown of a phenomenon into influencing factors.",
        "valid_group_numbers": [1, 2, 3],  # 1=factor 1, 2=factor 2, 3=factor 3
    },
    "overview_to_detail": {
        "id": "overview_to_detail",
        "name": "Overview To Detail",
        "filename": "unique_stories/2_overview_to_detail.txt",
        "number": 5,
        "description": "A broad snapshot of a phenomenon, followed by finer details.",
        "valid_group_numbers": [1, 2, 3, 4],  # 1=overview, 2=detail 1, 3=detail 2, 4=detail 3
    },
    "problem_solution": {
        "id": "problem_solution",
        "name": "Problem and Solution",
        "filename": "unique_stories/7_problem_solution_framework.txt",
        "number": 6,
        "description": "A challenge, followed by evidence for a solution.",
        "valid_group_numbers": [1, 2],  # 1=problem, 2=solution
    },
    "comparative": {
        "id": "comparative",
        "name": "Comparative Analysis",
        "filename": "unique_stories/5_comparative_analysis.txt",
        "number": 7,
        "description": "A side-by-side view of events to reveal similarities and differences.",
        "valid_group_numbers": [1, 2],  # 1=item 1, 2=item 2
    },
    "workflow_process": {
        "id": "workflow_process",
        "name": "Workflow or Process",
        "filename": "unique_stories/4_workflow_process.txt",
        "number": 8,
        "description": "Discusses the key stages of a system or pipeline.",
        "valid_group_numbers": [1, 2, 3],  # 1=stage 1, 2=stage 2, 3=stage 3
    },
    "shock_lead": {
        "id": "shock_lead",
        "name": "Shock and Lead",
        "filename": "unique_stories/9_shock_and_lead.txt",
        "number": 9,
        "description": "A striking fact, followed by analysis of explanatory factors.",
        "valid_group_numbers": [1, 2],  # 1=shock fact, 2=explanatory factors
    },
}

# Literal type and Pydantic model for story structure selection outputs
StoryStructureId = Literal[
    "cause_and_effect",
    "question_answer",
    "time_based",
    "overview_to_detail",
    "problem_solution",
    "comparative",
    "workflow_process",
    "factor_analysis",
    "shock_lead",
]


class StoryStructureChoice(BaseModel):
    id: StoryStructureId
