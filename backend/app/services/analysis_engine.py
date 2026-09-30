import math
import re

import pandas as pd

from app.services.resource_limits import truncate_result


SUPPORTED_OPERATIONS = {
    "describe",
    "group_by",
    "top_n",
    "filter",
    "sort",
    "correlation",
    "compare",
    "share",
    "difference",
    "percentage_change",
    "time_group",
}

SUPPORTED_AGGREGATIONS = {"sum", "mean", "min", "max", "count"}
SUPPORTED_FILTER_OPERATORS = {"eq", "gt", "gte", "lt", "lte", "between"}


def _validate_column(dataframe: pd.DataFrame, column: str | None, field_name: str):
    if not column:
        raise ValueError(f"'{field_name}' is required")
    if column not in dataframe.columns:
        raise ValueError(f"Column '{column}' does not exist")


def _validate_aggregation(dataframe: pd.DataFrame, metric_column: str | None, aggregation: str | None):
    _validate_column(dataframe, metric_column, "metric_column")
    if aggregation not in SUPPORTED_AGGREGATIONS:
        raise ValueError(f"Unsupported aggregation: {aggregation}")
    if aggregation in {"sum", "mean", "min", "max"} and not pd.api.types.is_numeric_dtype(dataframe[metric_column]):
        raise ValueError(f"Column '{metric_column}' must be numeric for aggregation '{aggregation}'")


def _validate_comparison(dataframe: pd.DataFrame, plan: dict):
    _validate_column(dataframe, plan.get("column"), "column")
    _validate_aggregation(dataframe, plan.get("metric_column"), plan.get("aggregation"))
    values = plan.get("comparison_values")
    if not isinstance(values, list) or len(values) != 2:
        raise ValueError("Comparison requires exactly two comparison_values")
    if values[0] == values[1]:
        raise ValueError("Comparison values must be different")
    available = set(dataframe[plan["column"]].dropna().tolist())
    missing = [value for value in values if value not in available]
    if missing:
        raise ValueError(f"Comparison value(s) not found in '{plan['column']}': {missing}")


def validate_plan(plan: dict, dataframe: pd.DataFrame):
    operation = plan.get("operation")
    if operation not in SUPPORTED_OPERATIONS:
        raise ValueError(f"Unsupported operation: {operation}")

    if operation in {"group_by", "top_n"}:
        _validate_column(dataframe, plan.get("column"), "column")
        _validate_aggregation(dataframe, plan.get("metric_column"), plan.get("aggregation"))
        if not isinstance(plan.get("descending", False), bool):
            raise ValueError("'descending' must be a boolean")
        if not isinstance(plan.get("rank", False), bool):
            raise ValueError("'rank' must be a boolean")
        if operation == "top_n":
            limit = plan.get("limit")
            if not isinstance(limit, int) or limit <= 0 or limit > 1000:
                raise ValueError("top_n limit must be an integer between 1 and 1000")

    elif operation == "filter":
        column = plan.get("column")
        operator = plan.get("operator")
        value = plan.get("value")
        _validate_column(dataframe, column, "column")
        if operator not in SUPPORTED_FILTER_OPERATORS:
            raise ValueError(f"Unsupported filter operator: {operator}")
        if value is None:
            raise ValueError("Filter requires a value")
        series = dataframe[column]
        if operator == "between":
            if not isinstance(value, list) or len(value) != 2:
                raise ValueError("between requires exactly two values")
        elif operator != "eq" and not (
            pd.api.types.is_numeric_dtype(series)
            or pd.api.types.is_datetime64_any_dtype(series)
        ):
            raise ValueError(f"Operator '{operator}' requires a numeric or datetime column")

    elif operation == "sort":
        _validate_column(dataframe, plan.get("column"), "column")
        if not isinstance(plan.get("descending", False), bool):
            raise ValueError("'descending' must be a boolean")

    elif operation == "correlation":
        columns = plan.get("columns")
        if not columns or len(columns) < 2:
            raise ValueError("Correlation requires at least 2 columns")
        if len(columns) != len(set(columns)):
            raise ValueError("Correlation columns must be unique")
        for column in columns:
            _validate_column(dataframe, column, "columns")
            if not pd.api.types.is_numeric_dtype(dataframe[column]):
                raise ValueError(f"Column '{column}' must be numeric for correlation")
        if len(dataframe[columns].dropna()) < 2:
            raise ValueError("Correlation requires at least 2 complete observations")

    elif operation == "share":
        _validate_column(dataframe, plan.get("column"), "column")
        _validate_aggregation(dataframe, plan.get("metric_column"), plan.get("aggregation"))

    elif operation in {"compare", "difference", "percentage_change"}:
        _validate_comparison(dataframe, plan)

    elif operation == "time_group":
        _validate_column(dataframe, plan.get("column"), "column")
        _validate_aggregation(dataframe, plan.get("metric_column"), plan.get("aggregation"))
        if plan.get("period") not in {"day", "week", "month", "quarter", "year"}:
            raise ValueError("Unsupported time grouping period")


def _clean_value(value):
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _clean_records(records):
    return [{key: _clean_value(value) for key, value in record.items()} for record in records]


def _grouped_values(dataframe: pd.DataFrame, plan: dict):
    grouped = (
        dataframe[dataframe[plan["column"]].isin(plan["comparison_values"])]
        .groupby(plan["column"], dropna=False)[plan["metric_column"]]
        .agg(plan["aggregation"])
    )
    values = {}
    for category in plan["comparison_values"]:
        value = _clean_value(grouped.get(category))
        if value is None:
            raise ValueError("Comparison produced a missing result")
        values[str(category)] = value
    return values


def _aggregate_dataframe(dataframe: pd.DataFrame, plan: dict):
    return (
        dataframe.groupby(plan["column"], dropna=False)[plan["metric_column"]]
        .agg(plan["aggregation"])
        .reset_index()
    )


def execute_plan(dataframe: pd.DataFrame, plan: dict):
    validate_plan(plan, dataframe)
    operation = plan["operation"]

    if operation == "describe":
        if dataframe.empty:
            return {"operation": operation, "result": {}, "row_count": 0, "column_count": len(dataframe.columns)}
        result = dataframe.describe(include="all").map(_clean_value)
        return {
            "operation": operation,
            "result": result.to_dict(),
            "row_count": len(dataframe),
            "column_count": len(dataframe.columns),
        }

    if operation in {"group_by", "top_n"}:
        grouped = _aggregate_dataframe(dataframe, plan)
        rank = plan.get("rank", operation == "top_n")
        descending = plan.get("descending", True if operation == "top_n" else False)
        if rank:
            grouped = grouped.sort_values(
                by=plan["metric_column"],
                ascending=not descending,
                na_position="last",
            )
        limit = plan.get("limit")
        if limit is not None:
            grouped = grouped.head(limit)
        records = grouped.to_dict(orient="records")
        return {
            "operation": operation,
            "group_column": plan["column"],
            "metric_column": plan["metric_column"],
            "aggregation": plan["aggregation"],
            "descending": descending,
            "rank": rank,
            "limit": limit,
            "result": _clean_records(records),
            "group_count": len(records),
        }

    if operation == "filter":
        column, operator, value = plan["column"], plan["operator"], plan["value"]
        series = dataframe[column]

        def coerce(single):
            if pd.api.types.is_numeric_dtype(series):
                try:
                    return float(single)
                except (TypeError, ValueError):
                    raise ValueError(f"Value '{single}' must be numeric for column '{column}'")
            if pd.api.types.is_datetime64_any_dtype(series):
                try:
                    return pd.to_datetime(single)
                except (TypeError, ValueError):
                    raise ValueError(f"Value '{single}' is not a valid datetime for column '{column}'")
            return single

        if operator == "between":
            lower, upper = [coerce(item) for item in value]
            if lower > upper:
                lower, upper = upper, lower
            filtered = dataframe[(series >= lower) & (series <= upper)]
        else:
            value = coerce(value)
            if operator == "eq":
                filtered = dataframe[series == value]
            elif operator == "gt":
                filtered = dataframe[series > value]
            elif operator == "gte":
                filtered = dataframe[series >= value]
            elif operator == "lt":
                filtered = dataframe[series < value]
            elif operator == "lte":
                filtered = dataframe[series <= value]
            else:
                raise ValueError(f"Unsupported filter operator: {operator}")

        output, truncated = truncate_result(filtered)
        return {
            "operation": operation,
            "column": column,
            "operator": operator,
            "value": _clean_value(value) if not isinstance(value, list) else [_clean_value(item) for item in value],
            "result": _clean_records(output.to_dict(orient="records")),
            "row_count": len(filtered),
            "returned_rows": len(output),
            "truncated": truncated,
        }

    if operation == "sort":
        sorted_dataframe = dataframe.sort_values(
            by=plan["column"],
            ascending=not plan.get("descending", False),
            na_position="last",
        )
        limit = plan.get("limit")
        requested_limit = limit
        if limit is None:
            limit = 5000
        sorted_dataframe = sorted_dataframe.head(limit)
        return {
            "operation": operation,
            "column": plan["column"],
            "descending": plan.get("descending", False),
            "limit": requested_limit,
            "returned_rows": len(sorted_dataframe),
            "truncated": requested_limit is None and len(dataframe) > len(sorted_dataframe),
            "result": _clean_records(sorted_dataframe.to_dict(orient="records")),
        }

    if operation == "correlation":
        correlation = dataframe[plan["columns"]].corr().fillna(0).map(_clean_value)
        return {"operation": operation, "columns": plan["columns"], "result": correlation.to_dict()}

    if operation == "share":
        grouped = _aggregate_dataframe(dataframe, plan)
        total = grouped[plan["metric_column"]].sum()
        records = []
        for record in grouped.to_dict(orient="records"):
            category = record[plan["column"]]
            value = _clean_value(record[plan["metric_column"]])
            if value is None:
                continue
            share = None if total == 0 else float(value) / float(total) * 100
            records.append({
                "category": None if pd.isna(category) else str(category),
                "value": value,
                "percentage_share": _clean_value(share),
            })
        records.sort(key=lambda item: item["value"], reverse=True)
        return {
            "operation": operation,
            "group_column": plan["column"],
            "metric_column": plan["metric_column"],
            "aggregation": plan["aggregation"],
            "total": _clean_value(total),
            "result": records,
        }

    if operation in {"compare", "difference", "percentage_change"}:
        values = _grouped_values(dataframe, plan)
        first, second = float(values[str(plan["comparison_values"][0])]), float(values[str(plan["comparison_values"][1])])
        base = abs(second)
        signed_difference = first - second
        absolute_difference = abs(signed_difference)
        percentage_change = None if base == 0 else signed_difference / base * 100
        result = {
            "operation": operation,
            "group_column": plan["column"],
            "metric_column": plan["metric_column"],
            "aggregation": plan["aggregation"],
            "comparison_values": plan["comparison_values"],
            "result": [{"category": category, "value": values[str(category)]} for category in plan["comparison_values"]],
        }
        if operation == "compare":
            denominator = (abs(first) + abs(second)) / 2
            result["percentage_difference"] = None if denominator == 0 else abs(signed_difference) / denominator * 100
        else:
            result.update({
                "signed_difference": signed_difference,
                "absolute_difference": absolute_difference,
                "percentage_change": percentage_change,
            })
        return {key: _clean_value(value) if not isinstance(value, list) else value for key, value in result.items()}

    if operation == "time_group":
        series = pd.to_datetime(dataframe[plan["column"]], errors="coerce")
        valid = dataframe.loc[series.notna()].copy()
        dates = series.loc[series.notna()]
        period = plan["period"]
        if period == "day":
            valid["_time_group"] = dates.dt.strftime("%Y-%m-%d")
        elif period == "week":
            valid["_time_group"] = dates.dt.to_period("W").astype(str)
        elif period == "month":
            valid["_time_group"] = dates.dt.to_period("M").astype(str)
        elif period == "quarter":
            valid["_time_group"] = dates.dt.to_period("Q").astype(str)
        else:
            valid["_time_group"] = dates.dt.year.astype(str)
        grouped = valid.groupby("_time_group")[plan["metric_column"]].agg(plan["aggregation"]).reset_index()
        grouped = grouped.sort_values("_time_group")
        records = [
            {"period": str(row["_time_group"]), "value": _clean_value(row[plan["metric_column"]])}
            for row in grouped.to_dict(orient="records")
        ]
        return {
            "operation": operation,
            "date_column": plan["column"],
            "metric_column": plan["metric_column"],
            "aggregation": plan["aggregation"],
            "period": period,
            "result": records,
        }

    raise ValueError(f"Operation '{operation}' is not implemented")


_REFERENCE_PATTERN = re.compile(r"^\$([A-Za-z0-9_-]+)\[(\d+)\]\.([^\.]+)$")


def _resolve_reference(value, step_results: dict):
    if not isinstance(value, str):
        return value

    match = _REFERENCE_PATTERN.match(value)
    if not match:
        return value

    step_id, index_text, column = match.groups()
    previous = step_results.get(step_id)

    if previous is None:
        raise ValueError(f"Reference step '{step_id}' has not produced a result")

    records = previous.get("result")
    if not isinstance(records, list):
        raise ValueError(f"Reference step '{step_id}' does not contain tabular rows")

    index = int(index_text)
    if index >= len(records):
        raise ValueError(f"Reference '{value}' is outside the available result rows")

    record = records[index]
    if not isinstance(record, dict) or column not in record:
        raise ValueError(
            f"Reference column '{column}' was not found in step '{step_id}'"
        )

    return record[column]


def _resolve_plan_references(plan: dict, step_results: dict):
    resolved = dict(plan)

    if isinstance(resolved.get("comparison_values"), list):
        resolved["comparison_values"] = [
            _resolve_reference(value, step_results)
            for value in resolved["comparison_values"]
        ]

    return resolved


def _result_dataframe(result: dict) -> pd.DataFrame:
    records = result.get("result")

    if not isinstance(records, list):
        raise ValueError(
            "This step cannot be used as input because it did not produce tabular rows"
        )

    if not records:
        raise ValueError("This step produced no rows for the next step")

    return pd.DataFrame(records)


def execute_workflow(dataframe: pd.DataFrame, workflow: dict):
    steps = workflow.get("steps")

    if not isinstance(steps, list) or not steps:
        raise ValueError("Workflow requires at least one step")

    if len(steps) > 10:
        raise ValueError("Workflow cannot contain more than 10 steps")

    step_results = {}

    for index, raw_step in enumerate(steps):
        step = dict(raw_step)
        step_id = step.get("id")
        input_id = step.get("input")

        if not step_id:
            raise ValueError("Every workflow step requires an id")

        if input_id is None:
            if index > 0:
                raise ValueError(
                    f"Step '{step_id}' must reference an earlier step"
                )
            step_dataframe = dataframe
        else:
            if input_id not in step_results:
                raise ValueError(
                    f"Step '{step_id}' references unavailable step '{input_id}'"
                )
            step_dataframe = _result_dataframe(step_results[input_id])

        plan = {
            key: value
            for key, value in step.items()
            if key not in {"id", "input"}
        }
        plan = _resolve_plan_references(plan, step_results)

        result = execute_plan(
            dataframe=step_dataframe,
            plan=plan,
        )
        step_results[step_id] = result

    final_step_id = steps[-1]["id"]

    return {
        "workflow": {
            "step_count": len(steps),
            "steps": [
                {
                    "id": step["id"],
                    "operation": step["operation"],
                }
                for step in steps
            ],
        },
        "final": step_results[final_step_id],
    }
