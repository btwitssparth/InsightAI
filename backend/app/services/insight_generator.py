import json

from app.services.ai import client, MODEL_NAME


def generate_insight(
    question: str,
    result: dict,
) -> str:

    prompt = f"""
You are the insight generation component of InsightAI.

Your job is to explain an analysis result that has already
been calculated by the application's analysis engine.

IMPORTANT RULES:
- Do not perform new calculations.
- Do not invent numbers.
- Do not modify the supplied values.
- Do not make claims that are not supported by the result.
- Use only the supplied question and analysis result.
- Give a concise, clear answer suitable for a data analysis application.
- If the result does not provide enough information to answer
  the question, explicitly say that.

User question:
{question}

Verified analysis result:
{json.dumps(result, indent=2, default=str)}

Return only the natural-language insight.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )

    if not response.text:
        raise ValueError(
            "Gemini returned an empty insight"
        )

    return response.text.strip()