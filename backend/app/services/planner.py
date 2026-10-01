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
- columns MUST be a JSON array of strings, or null. Never use a single string for columns.
- comparison_values MUST be a JSON array of exactly two values when required, or null.
- descending and rank MUST always be JSON booleans, never null or strings.

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
11. If the question asks for percentage share, contribution, proportion, or percentage of a total, you MUST create a share step. The share step MUST include column, metric_column, and aggregation.
12. A share step should normally read the original dataset with input=null so the denominator is the full dataset total. Do not calculate share from a top_n result because that would change the denominator.
13. If the requested share is for a ranked item such as the highest-revenue product, create the share calculation as an independent branch on the original dataset and also create the ranking branch needed to identify that item. All verified step results are available to the insight generator, which can match the ranked item to its share.
14. For difference or percentage_change, the step MUST include column, metric_column, aggregation, and exactly two comparison_values. Use dynamic references when the compared categories were identified by an earlier ranking step.
15. For group_by and top_n, ALWAYS include column, metric_column, and aggregation. top_n MUST also include limit.
16. Do not create separate group_by steps for each named category/value. If the question names specific categories, use the actual category column and filter those values when needed; one group_by can aggregate multiple categories.
17. Before returning the workflow, check every distinct fact requested by the user and ensure at least one step produces the verified data needed to answer it. Do not omit a requested fact just because another branch answers part of the question.
17. The final step may be any result, but all step results will be available to the insight generator.
18. Return only JSON. No markdown or explanation.

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

    # Use a Gemini-compatible JSON schema instead of passing the Pydantic
    # model directly. Pydantic's Field(gt=0) becomes "exclusiveMinimum"
    # in its generated schema, which the Gemini API schema transformer
    # does not accept.
    # Keep operation-specific required fields non-null in Gemini's schema.
    # The API supports anyOf/oneOf in structured JSON output, so use an
    # operation-discriminated schema rather than making every field nullable.
    # This prevents a valid-looking but unusable group_by/top_n/share plan
    # such as {"operation": "group_by", "column": null}.
    common_properties = {
        "id": {"type": "string"},
        "input": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "operation": {"type": "string"},
        "column": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "metric_column": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "aggregation": {"anyOf": [{"type": "string", "enum": ["sum", "mean", "min", "max", "count"]}, {"type": "null"}]},
        "operator": {"anyOf": [{"type": "string", "enum": ["eq", "gt", "gte", "lt", "lte", "between"]}, {"type": "null"}]},
        "value": {
            "anyOf": [
                {"type": "string"},
                {"type": "integer"},
                {"type": "number"},
                {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "integer"},
                            {"type": "number"},
                        ]
                    },
                },
                {"type": "null"},
            ]
        },
        "comparison_values": {
            "anyOf": [
                {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "integer"},
                            {"type": "number"},
                        ]
                    },
                },
                {"type": "null"},
            ]
        },
        "descending": {"type": "boolean"},
        "rank": {"type": "boolean"},
        "limit": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
        "columns": {
            "anyOf": [
                {"type": "array", "items": {"type": "string"}},
                {"type": "null"},
            ]
        },
        "period": {"anyOf": [{"type": "string", "enum": ["day", "week", "month", "quarter", "year"]}, {"type": "null"}]},
    }

    common_required = [
        "id",
        "input",
        "operation",
        "column",
        "metric_column",
        "aggregation",
        "operator",
        "value",
        "comparison_values",
        "descending",
        "rank",
        "limit",
        "columns",
        "period",
    ]

    def operation_schema(
        operation: str,
        required_non_null: list[str],
    ) -> dict:
        properties = {
            key: value.copy() if isinstance(value, dict) else value
            for key, value in common_properties.items()
        }
        properties["operation"] = {"type": "string", "enum": [operation]}

        # Replace nullable definitions for fields that are mandatory for the
        # selected operation. Other fields remain explicitly nullable because
        # they are irrelevant to that operation.
        for field in required_non_null:
            if field == "column" or field == "metric_column":
                properties[field] = {"type": "string"}
            elif field == "aggregation":
                properties[field] = {
                    "type": "string",
                    "enum": ["sum", "mean", "min", "max", "count"],
                }
            elif field == "operator":
                properties[field] = {
                    "type": "string",
                    "enum": ["eq", "gt", "gte", "lt", "lte", "between"],
                }
            elif field == "limit":
                properties[field] = {"type": "integer", "minimum": 1, "maximum": 1000}
            elif field == "period":
                properties[field] = {
                    "type": "string",
                    "enum": ["day", "week", "month", "quarter", "year"],
                }
            elif field == "columns":
                properties[field] = {
                    "type": "array",
                    "items": {"type": "string"},
                }
            elif field == "comparison_values":
                properties[field] = {
                    "type": "array",
                    "minItems": 2,
                    "maxItems": 2,
                    "items": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "integer"},
                            {"type": "number"},
                        ]
                    },
                }

        return {
            "type": "object",
            "properties": properties,
            "required": common_required,
        }

    step_variants = [
        operation_schema("describe", []),
        operation_schema("group_by", ["column", "metric_column", "aggregation"]),
        operation_schema("top_n", ["column", "metric_column", "aggregation", "limit"]),
        operation_schema("filter", ["column", "operator", "value"]),
        operation_schema("sort", ["column"]),
        operation_schema("correlation", ["columns"]),
        operation_schema("compare", ["column", "metric_column", "aggregation", "comparison_values"]),
        operation_schema("share", ["column", "metric_column", "aggregation"]),
        operation_schema("difference", ["column", "metric_column", "aggregation", "comparison_values"]),
        operation_schema("percentage_change", ["column", "metric_column", "aggregation", "comparison_values"]),
        operation_schema("time_group", ["column", "metric_column", "aggregation", "period"]),
    ]

    gemini_workflow_schema = {
        "type": "object",
        "properties": {
            "steps": {
                "type": "array",
                "minItems": 1,
                "maxItems": 10,
                "items": {"anyOf": step_variants},
            }
        },
        "required": ["steps"],
    }

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": gemini_workflow_schema,
        },
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

    # Gemini structured output can omit operation-specific fields even though
    # the operation itself is valid. Normalize common missing fields before
    # Pydantic's operation validators run.
    operation_defaults = {
        "group_by": {
            "column": None,
            "metric_column": None,
            "aggregation": None,
        },
        "top_n": {
            "column": None,
            "metric_column": None,
            "aggregation": None,
            "limit": None,
        },
        "share": {
            "column": None,
            "metric_column": None,
            "aggregation": None,
        },
        "difference": {
            "column": None,
            "metric_column": None,
            "aggregation": None,
            "comparison_values": None,
        },
        "percentage_change": {
            "column": None,
            "metric_column": None,
            "aggregation": None,
            "comparison_values": None,
        },
    }

    # Do not invent values here. Missing required fields must still fail
    # validation; this normalization only makes the generated structure
    # explicit and keeps the error deterministic.
    for step in plan_data.get("steps", []):
        if isinstance(step, dict):
            operation = step.get("operation")
            for field, default in operation_defaults.get(operation, {}).items():
                step.setdefault(field, default)

    # Gemini may emit explicit nulls for optional boolean fields.
    # Pydantic defaults only apply when a field is omitted, not when it is null.
    # Normalize those values before strict workflow validation.
    for step in plan_data.get("steps", []):
        if isinstance(step, dict):
            if step.get("descending") is None:
                step["descending"] = False
            if step.get("rank") is None:
                step["rank"] = False
            if isinstance(step.get("columns"), str):
                step["columns"] = [step["columns"]]

    try:
        return AnalysisWorkflow.model_validate(
            plan_data
        )

    except ValidationError as error:
        raise ValueError(
            f"Gemini generated an invalid analysis plan: {error}"
        )