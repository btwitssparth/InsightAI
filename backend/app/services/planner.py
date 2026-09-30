import json

from pydantic import ValidationError

from app.models.analysis_schema import AnalysisWorkflow
from app.services.ai import client, MODEL_NAME


def generate_analysis_plan(
    question: str,
    dataset_profile: dict,
) -> AnalysisWorkflow:

    prompt = """
You are the analysis planning component of InsightAI.

Convert the user's natural-language question into a structured multi-step analysis workflow.

Return ONLY a JSON object with a "steps" array. Each step must contain:
- id: unique string
- input: null to use the original dataset, otherwise an earlier step id
- operation: describe | group_by | top_n | filter | sort | correlation | compare | share | difference | percentage_change | time_group
- the same operation fields used by the existing AnalysisPlan

Rules:
1. Use only columns present in DATASET PROFILE.
2. Use one step for simple questions and multiple dependent steps for complex questions.
3. Maximum 10 steps.
4. Never calculate results yourself.
5. A step with input=null reads the original dataset. A step with input=<step id> reads that step's tabular result.
6. Use null input for independent calculations that must use the original dataset. This allows branches for questions requiring multiple independent facts.
7. When a later step needs a value produced by an earlier step, use:
   "$STEP_ID[INDEX].COLUMN_NAME"
8. For top/bottom questions use top_n with rank=true and limit.
9. For ranking followed by comparison, first group_by, then top_n, then difference/percentage_change using dynamic references.
10. If the question asks for multiple independent facts, create the required branches and make sure the workflow contains a step for each requested fact.
11. The final step may be any result, but all step results will be available to the insight generator.
12. Return only JSON. No markdown or explanation.

EXAMPLE:
Question: "Which product generated the most revenue and how much higher was it than the second-highest?"

EXAMPLE WORKFLOW:
{
  "steps": [
    {
      "id": "revenue_by_product",
      "input": null,
      "operation": "group_by",
      "column": "Product",
      "metric_column": "Revenue",
      "aggregation": "sum",
      "descending": true,
      "rank": true,
      "limit": 10,
      "operator": null,
      "value": null,
      "comparison_values": null,
      "columns": null,
      "period": null
    },
    {
      "id": "top_two",
      "input": "revenue_by_product",
      "operation": "top_n",
      "column": "Product",
      "metric_column": "Revenue",
      "aggregation": "sum",
      "descending": true,
      "rank": true,
      "limit": 2,
      "operator": null,
      "value": null,
      "comparison_values": null,
      "columns": null,
      "period": null
    },
    {
      "id": "difference_top_two",
      "input": "top_two",
      "operation": "difference",
      "column": "Product",
      "metric_column": "Revenue",
      "aggregation": "sum",
      "comparison_values": [
        "$top_two[0].Product",
        "$top_two[1].Product"
      ],
      "descending": false,
      "rank": false,
      "limit": null,
      "operator": null,
      "value": null,
      "columns": null,
      "period": null
    }
  ]
}

DATASET PROFILE:

{dataset_profile}

USER QUESTION:

{question}

Return ONLY the JSON object.
"""
    prompt = prompt.replace("{dataset_profile}", json.dumps(dataset_profile, indent=2, default=str))
    prompt = prompt.replace("{question}", question)

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )

    if not response.text:
        raise ValueError(
            "Gemini returned an empty analysis plan"
        )

    raw_text = response.text.strip()

    # Remove markdown code fences if Gemini adds them.
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        raw_text = "\n".join(lines).strip()

    try:
        plan_data = json.loads(raw_text)

    except json.JSONDecodeError as error:
        raise ValueError(
            f"Gemini returned invalid JSON: {error}"
        )

    if not isinstance(plan_data, dict):
        raise ValueError(
            "Gemini analysis plan must be a JSON object"
        )

    # Gemini may emit explicit nulls for optional boolean fields.
    # Pydantic defaults only apply when a field is omitted, not when it is null.
    # Normalize those values before strict workflow validation.
    for step in plan_data.get("steps", []):
        if isinstance(step, dict):
            if step.get("descending") is None:
                step["descending"] = False
            if step.get("rank") is None:
                step["rank"] = False

    try:
        return AnalysisWorkflow.model_validate(
            plan_data
        )

    except ValidationError as error:
        raise ValueError(
            f"Gemini generated an invalid analysis plan: {error}"
        )