import json

from pydantic import ValidationError

from app.models.analysis_schema import AnalysisPlan
from app.services.ai import client, MODEL_NAME


def generate_analysis_plan(
    question: str,
    dataset_profile: dict,
) -> AnalysisPlan:

    prompt = f"""
You are the analysis planning component of InsightAI.

Convert the user's natural-language question into ONE
structured analysis plan.

You MUST return ONLY a JSON OBJECT.

The JSON object MUST contain exactly these possible fields:

{{
  "operation": "describe | group_by | filter | sort | correlation | compare",
  "column": "string or null",
  "metric_column": "string or null",
  "aggregation": "sum | mean | min | max | count | null",
  "operator": "eq | gt | gte | lt | lte | null",
  "value": "string | number | null",
  "comparison_values": ["string | number", "string | number"] or null,
  "descending": true or false,
  "limit": "integer or null",
  "columns": ["string", "..."] or null
}}

IMPORTANT:

1. Never invent column names.
2. Use ONLY column names present in DATASET PROFILE.
3. Do not nest objects inside column, metric_column, aggregation,
   operator, value, descending, or limit.
4. "column" MUST always be a plain string or null.
5. "metric_column" MUST always be a plain string or null.
6. "aggregation" MUST always be a plain string or null.
7. "descending" MUST always be a boolean.
8. "limit" MUST always be an integer or null.
9. "columns" MUST be an array of plain strings or null.
10. Do not calculate results.
11. Do not answer the user's question.
12. Return only the JSON object. No markdown. No explanation.

SUPPORTED OPERATIONS:

describe
Use for general statistical summaries.

group_by
Use when calculating an aggregate for each category/product/group.

filter
Use when selecting rows based on a condition.

sort
Use when ordering rows by a column.

correlation
Use when examining relationships between numeric columns.

compare
Use when the user explicitly asks to compare exactly two categories/products/groups on an aggregated numeric metric. Put the category column in "column", the numeric sales/revenue/etc. column in "metric_column", the aggregation in "aggregation", and the two exact category values in "comparison_values".

IMPORTANT EXAMPLES:

Question:
"Which products generated the most revenue?"

Correct JSON:
{{
  "operation": "group_by",
  "column": "Product",
  "metric_column": "Revenue",
  "aggregation": "sum",
  "descending": true,
  "limit": 10,
  "operator": null,
  "value": null,
  "columns": null,
  "comparison_values": null
}}

Question:
"What is the average revenue for each product?"

Correct JSON:
{{
  "operation": "group_by",
  "column": "Product",
  "metric_column": "Revenue",
  "aggregation": "mean",
  "descending": false,
  "limit": null,
  "operator": null,
  "value": null,
  "columns": null
}}

Question:
"Show me transactions where revenue is greater than 50000."

Correct JSON:
{{
  "operation": "filter",
  "column": "Revenue",
  "metric_column": null,
  "aggregation": null,
  "operator": "gt",
  "value": 50000,
  "descending": false,
  "limit": null,
  "columns": null
}}

Question:
"Show the highest revenue transactions."

Correct JSON:
{{
  "operation": "sort",
  "column": "Revenue",
  "metric_column": null,
  "aggregation": null,
  "operator": null,
  "value": null,
  "descending": true,
  "limit": 10,
  "columns": null
}}

Question:
"What is the correlation between revenue and quantity?"

Correct JSON:
{{
  "operation": "correlation",
  "column": null,
  "metric_column": null,
  "aggregation": null,
  "operator": null,
  "value": null,
  "descending": false,
  "limit": null,
  "columns": ["Revenue", "Quantity"]
}}

DATASET PROFILE:

{json.dumps(dataset_profile, indent=2, default=str)}

USER QUESTION:

{question}

Return ONLY the JSON object.
"""

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

    try:
        return AnalysisPlan.model_validate(
            plan_data
        )

    except ValidationError as error:
        raise ValueError(
            f"Gemini generated an invalid analysis plan: {error}"
        )