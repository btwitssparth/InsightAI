import math

import pandas as pd


SUPPORTED_OPERATIONS = {
    "describe",
    "group_by",
    "filter",
    "sort",
    "correlation",
}

SUPPORTED_AGGREGATIONS = {
    "sum",
    "mean",
    "min",
    "max",
    "count",
}

SUPPORTED_FILTER_OPERATORS = {
    "eq",
    "gt",
    "gte",
    "lt",
    "lte",
}


def _validate_column(
    dataframe: pd.DataFrame,
    column: str | None,
    field_name: str,
) -> None:
    if not column:
        raise ValueError(
            f"'{field_name}' is required"
        )

    if column not in dataframe.columns:
        raise ValueError(
            f"Column '{column}' does not exist"
        )


def validate_plan(
    plan: dict,
    dataframe: pd.DataFrame,
) -> None:
    operation = plan.get("operation")

    if operation not in SUPPORTED_OPERATIONS:
        raise ValueError(
            f"Unsupported operation: {operation}"
        )

    if operation == "group_by":
        group_column = plan.get("column")
        metric_column = plan.get("metric_column")
        aggregation = plan.get("aggregation")

        _validate_column(
            dataframe,
            group_column,
            "column",
        )

        _validate_column(
            dataframe,
            metric_column,
            "metric_column",
        )

        if aggregation not in SUPPORTED_AGGREGATIONS:
            raise ValueError(
                f"Unsupported aggregation: {aggregation}"
            )

        if aggregation in {
            "sum",
            "mean",
            "min",
            "max",
        }:
            if not pd.api.types.is_numeric_dtype(
                dataframe[metric_column]
            ):
                raise ValueError(
                    f"Column '{metric_column}' "
                    f"must be numeric for "
                    f"aggregation '{aggregation}'"
                )

    elif operation == "filter":
        column = plan.get("column")
        operator = plan.get("operator")

        _validate_column(
            dataframe,
            column,
            "column",
        )

        if operator not in SUPPORTED_FILTER_OPERATORS:
            raise ValueError(
                f"Unsupported filter operator: {operator}"
            )

        if plan.get("value") is None:
            raise ValueError(
                "Filter requires a value"
            )

        series = dataframe[column]

        if operator != "eq":
            if not (
                pd.api.types.is_numeric_dtype(series)
                or pd.api.types.is_datetime64_any_dtype(series)
            ):
                raise ValueError(
                    f"Operator '{operator}' "
                    f"requires a numeric or "
                    f"datetime column"
                )

    elif operation == "sort":
        column = plan.get("column")

        _validate_column(
            dataframe,
            column,
            "column",
        )

        limit = plan.get("limit")

        if limit is not None:
            try:
                limit = int(limit)
            except (TypeError, ValueError):
                raise ValueError(
                    "Sort limit must be an integer"
                )

            if limit <= 0:
                raise ValueError(
                    "Sort limit must be greater than 0"
                )

    elif operation == "correlation":
        columns = plan.get("columns")

        if not columns:
            raise ValueError(
                "Correlation requires columns"
            )

        if len(columns) < 2:
            raise ValueError(
                "Correlation requires at least 2 columns"
            )

        for column in columns:
            _validate_column(
                dataframe,
                column,
                "columns",
            )

            if not pd.api.types.is_numeric_dtype(
                dataframe[column]
            ):
                raise ValueError(
                    f"Column '{column}' "
                    f"must be numeric for correlation"
                )


def _clean_value(value):
    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        value = value.item()

    if isinstance(value, float):
        if not math.isfinite(value):
            return None

    return value


def _clean_records(records: list[dict]) -> list[dict]:
    cleaned_records = []

    for record in records:
        cleaned_records.append(
            {
                key: _clean_value(value)
                for key, value in record.items()
            }
        )

    return cleaned_records


def execute_plan(
    dataframe: pd.DataFrame,
    plan: dict,
) -> dict:

    validate_plan(
        plan,
        dataframe,
    )

    operation = plan["operation"]

    if operation == "describe":
        result = dataframe.describe(
            include="all"
        )

        result = result.map(
            _clean_value
        )

        return {
            "operation": operation,
            "result": result.to_dict(),
        }

    if operation == "group_by":
        group_column = plan["column"]
        metric_column = plan["metric_column"]
        aggregation = plan["aggregation"]

        grouped = (
            dataframe
            .groupby(group_column)[metric_column]
            .agg(aggregation)
            .reset_index()
        )

        records = grouped.to_dict(
            orient="records"
        )

        return {
            "operation": operation,
            "group_column": group_column,
            "metric_column": metric_column,
            "aggregation": aggregation,
            "result": _clean_records(records),
        }

    if operation == "filter":
        column = plan["column"]
        operator = plan["operator"]
        value = plan["value"]

        series = dataframe[column]

        if operator != "eq":
            try:
                value = pd.to_numeric(
                    value
                )
            except (TypeError, ValueError):
                raise ValueError(
                    f"Value '{value}' "
                    f"must be numeric for "
                    f"operator '{operator}'"
                )

        if operator == "eq":
            filtered = dataframe[
                series == value
            ]

        elif operator == "gt":
            filtered = dataframe[
                series > value
            ]

        elif operator == "gte":
            filtered = dataframe[
                series >= value
            ]

        elif operator == "lt":
            filtered = dataframe[
                series < value
            ]

        elif operator == "lte":
            filtered = dataframe[
                series <= value
            ]

        return {
            "operation": operation,
            "result": _clean_records(
                filtered.to_dict(
                    orient="records"
                )
            ),
            "row_count": len(filtered),
        }

    if operation == "sort":
        column = plan["column"]

        descending = plan.get(
            "descending",
            False,
        )

        sorted_dataframe = dataframe.sort_values(
            by=column,
            ascending=not descending,
        )

        limit = plan.get("limit")

        if limit is not None:
            sorted_dataframe = (
                sorted_dataframe.head(
                    int(limit)
                )
            )

        return {
            "operation": operation,
            "result": _clean_records(
                sorted_dataframe.to_dict(
                    orient="records"
                )
            ),
        }

    if operation == "correlation":
        columns = plan["columns"]

        correlation = (
            dataframe[columns]
            .corr()
            .fillna(0)
        )

        correlation = correlation.map(
            _clean_value
        )

        return {
            "operation": operation,
            "columns": columns,
            "result": correlation.to_dict(),
        }

    raise ValueError(
        f"Operation '{operation}' "
        f"is not implemented"
    )