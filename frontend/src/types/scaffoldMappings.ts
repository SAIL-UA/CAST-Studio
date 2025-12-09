// Scaffold pattern to number mapping
export const SCAFFOLD_PATTERN_TO_NUMBER: { [key: string]: number } = {
  'cause_and_effect': 1,
  'question_answer': 2,
  'time_based': 3,
  'factor_analysis': 4,
  'overview_to_detail': 5,
  'problem_solution': 6,
  'comparative': 7,
  'workflow_process': 8,
  'shock_lead': 9,
};

// Scaffold number to pattern mapping
export const SCAFFOLD_NUMBER_TO_PATTERN: { [key: number]: string } = {
  1: 'cause_and_effect',
  2: 'question_answer',
  3: 'time_based',
  4: 'factor_analysis',
  5: 'overview_to_detail',
  6: 'problem_solution',
  7: 'comparative',
  8: 'workflow_process',
  9: 'shock_lead',
};

// Scaffold number to valid group numbers mapping
export const SCAFFOLD_VALID_GROUP_NUMBERS: { [key: number]: number[] } = {
  1: [1, 2],  // cause_and_effect: causes=1, effects=2
  2: [1, 2],  // question_answer: question=1, answer=2
  3: [1, 2, 3, 4],  // time_based: multiple time periods
  4: [1, 2, 3, 4, 5],  // factor_analysis: multiple factors
  5: [1, 2],  // overview_to_detail: overview=1, details=2
  6: [1, 2],  // problem_solution: problem=1, solution=2
  7: [1, 2],  // comparative: first=1, second=2
  8: [1, 2, 3, 4, 5],  // workflow_process: multiple stages
  9: [1, 2],  // shock_lead: shock=1, factors=2
};

// Scaffold group number to label mapping (for display purposes)
export const SCAFFOLD_GROUP_LABELS: { [scaffoldNumber: number]: { [groupNumber: number]: string } } = {
  1: { 1: 'Causes', 2: 'Effects' },  // cause_and_effect
  2: { 1: 'Question', 2: 'Answer' },  // question_answer
  3: { 1: 'Period 1', 2: 'Period 2', 3: 'Period 3', 4: 'Period 4' },  // time_based
  4: { 1: 'Factor 1', 2: 'Factor 2', 3: 'Factor 3', 4: 'Factor 4', 5: 'Factor 5' },  // factor_analysis
  5: { 1: 'Overview', 2: 'Details' },  // overview_to_detail
  6: { 1: 'Problem', 2: 'Solution' },  // problem_solution
  7: { 1: 'Item 1', 2: 'Item 2' },  // comparative
  8: { 1: 'Stage 1', 2: 'Stage 2', 3: 'Stage 3', 4: 'Stage 4', 5: 'Stage 5' },  // workflow_process
  9: { 1: 'Shock Fact', 2: 'Explanatory Factors' },  // shock_lead
};
