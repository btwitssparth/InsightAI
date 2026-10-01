def generate_follow_up_questions(
    question: str,
    plan: dict | None,
    result: dict | None,
) -> list[str]:
    """Build self-contained follow-up questions without another AI call."""
    if not plan or not result:
        return []

    steps = plan.get("steps") if isinstance(plan, dict) else None
    if not isinstance(steps, list):
        steps = [plan]

    analysis_step = next(
        (
            step for step in steps
            if isinstance(step, dict)
            and step.get("operation") in {"group_by", "top_n", "share", "time_group"}
        ),
        None,
    )

    if not analysis_step:
        return [
            "What are the main patterns in this result?",
            "Show me the top 5 values related to this analysis.",
        ]

    column = analysis_step.get("column")
    metric = analysis_step.get("metric_column")

    if not isinstance(column, str):
        column = "category"
    if not isinstance(metric, str):
        metric = "value"

    suggestions: list[str] = []

    if analysis_step.get("operation") in {"group_by", "top_n"}:
        suggestions.extend([
            f"Which {column} generated the most {metric}?",
            f"What percentage of total {metric} did the top {column} contribute?",
            f"How much higher was the top {column}'s {metric} than the second-highest?",
            f"Show me the top 5 {column} values by {metric}.",
        ])

    elif analysis_step.get("operation") == "share":
        suggestions.extend([
            f"Which {column} had the largest share of {metric}?",
            f"Show me the top 5 {column} values by {metric}.",
            f"How concentrated is {metric} across {column}?",
        ])

    elif analysis_step.get("operation") == "time_group":
        period = analysis_step.get("period") or "period"
        suggestions.extend([
            f"What {period} had the highest {metric}?",
            f"What is the trend in {metric} over time?",
            f"Which {period} had the lowest {metric}?",
        ])

    # Keep suggestions unique while preserving the intended order.
    unique: list[str] = []
    seen: set[str] = set()
    for suggestion in suggestions:
        normalized = suggestion.strip().lower()
        if normalized not in seen and normalized != question.strip().lower():
            seen.add(normalized)
            unique.append(suggestion)

    return unique[:4]
