import math

import pandas as pd

from app.services.resource_limits import truncate_result


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
):
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
):
    operation = plan.get("operation")

    if operation not in SUPPORTED_OPERATIONS:
        raise ValueError(
            f"Unsupported operation: {operation}"
        )

    # --------------------------------------------------
    # GROUP BY
    # --------------------------------------------------

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
                    f"Column '{metric_column}' must be numeric "
                    f"for aggregation '{aggregation}'"
                )

        descending = plan.get(
            "descending",
            False,
        )

        if not isinstance(
            descending,
            bool,
        ):
            raise ValueError(
                "'descending' must be a boolean"
            )

        limit = plan.get("limit")

        if limit is not None:
            if not isinstance(
                limit,
                int,
            ):
                raise ValueError(
                    "Group-by limit must be an integer"
                )

            if limit <= 0:
                raise ValueError(
                    "Group-by limit must be greater than 0"
                )

            if limit > 1000:
                raise ValueError(
                    "Group-by limit cannot exceed 1000"
                )

    # --------------------------------------------------
    # FILTER
    # --------------------------------------------------

    elif operation == "filter":
        column = plan.get("column")
        operator = plan.get("operator")
        value = plan.get("value")

        _validate_column(
            dataframe,
            column,
            "column",
        )

        if operator not in SUPPORTED_FILTER_OPERATORS:
            raise ValueError(
                f"Unsupported filter operator: {operator}"
            )

        if value is None:
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
                    f"Operator '{operator}' requires a numeric "
                    f"or datetime column"
                )

    # --------------------------------------------------
    # SORT
    # --------------------------------------------------

    elif operation == "sort":
        column = plan.get("column")
        limit = plan.get("limit")
        descending = plan.get(
            "descending",
            False,
        )

        _validate_column(
            dataframe,
            column,
            "column",
        )

        if not isinstance(
            descending,
            bool,
        ):
            raise ValueError(
                "'descending' must be a boolean"
            )

        if limit is not None:
            if not isinstance(
                limit,
                int,
            ):
                raise ValueError(
                    "Sort limit must be an integer"
                )

            if limit <= 0:
                raise ValueError(
                    "Sort limit must be greater than 0"
                )

            if limit > 1000:
                raise ValueError(
                    "Sort limit cannot exceed 1000"
                )

    # --------------------------------------------------
    # CORRELATION
    # --------------------------------------------------

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

        if len(columns) != len(set(columns)):
            raise ValueError(
                "Correlation columns must be unique"
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
                    f"Column '{column}' must be numeric "
                    f"for correlation"
                )

        numeric_data = dataframe[columns]

        if len(numeric_data.dropna()) < 2:
            raise ValueError(
                "Correlation requires at least 2 complete observations"
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


def _clean_records(records):
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
):
    validate_plan(
        plan,
        dataframe,
    )

    operation = plan["operation"]

    # --------------------------------------------------
    # DESCRIBE
    # --------------------------------------------------

    if operation == "describe":
        if dataframe.empty:
            return {
                "operation": operation,
                "result": {},
                "row_count": 0,
                "column_count": len(dataframe.columns),
            }

        result = dataframe.describe(
            include="all"
        )

        result = result.map(
            _clean_value
        )

        return {
            "operation": operation,
            "result": result.to_dict(),
            "row_count": len(dataframe),
            "column_count": len(dataframe.columns),
        }

    # --------------------------------------------------
    # GROUP BY
    # --------------------------------------------------

    if operation == "group_by":
        group_column = plan["column"]
        metric_column = plan["metric_column"]
        aggregation = plan["aggregation"]

        grouped = (
            dataframe
            .groupby(
                group_column,
                dropna=False,
            )[metric_column]
            .agg(aggregation)
            .reset_index()
        )

        descending = plan.get(
            "descending",
            False,
        )

        grouped = grouped.sort_values(
            by=metric_column,
            ascending=not descending,
            na_position="last",
        )

        limit = plan.get("limit")

        if limit is not None:
            grouped = grouped.head(limit)

        records = grouped.to_dict(
            orient="records"
        )

        return {
            "operation": operation,
            "group_column": group_column,
            "metric_column": metric_column,
            "aggregation": aggregation,
            "descending": descending,
            "limit": limit,
            "result": _clean_records(records),
            "group_count": len(records),
        }

    # --------------------------------------------------
    # FILTER
    # --------------------------------------------------

    if operation == "filter":
        column = plan["column"]
        operator = plan["operator"]
        value = plan["value"]

        series = dataframe[column]

        if pd.api.types.is_numeric_dtype(series):
            try:
                value = float(value)
            except (TypeError, ValueError):
                raise ValueError(
                    f"Value '{value}' must be numeric "
                    f"for column '{column}'"
                )

        elif pd.api.types.is_datetime64_any_dtype(series):
            try:
                value = pd.to_datetime(value)
            except (TypeError, ValueError):
                raise ValueError(
                    f"Value '{value}' is not a valid "
                    f"datetime for column '{column}'"
                )

        elif operator != "eq":
            raise ValueError(
                f"Operator '{operator}' cannot be used "
                f"with non-numeric, non-datetime column "
                f"'{column}'"
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

        else:
            raise ValueError(
                f"Unsupported filter operator: {operator}"
            )

        output, truncated = truncate_result(filtered)

        return {
            "operation": operation,
            "column": column,
            "operator": operator,
            "value": _clean_value(value),
            "result": _clean_records(
                output.to_dict(
                    orient="records"
                )
            ),
            "row_count": len(filtered),
            "returned_rows": len(output),
            "truncated": truncated,
        }

    # --------------------------------------------------
    # SORT
    # --------------------------------------------------

    if operation == "sort":
        column = plan["column"]

        descending = plan.get(
            "descending",
            False,
        )

        sorted_dataframe = dataframe.sort_values(
            by=column,
            ascending=not descending,
            na_position="last",
        )

        limit = plan.get("limit")

        requested_limit = limit
        if limit is None:
            limit = 5000

        sorted_dataframe = sorted_dataframe.head(limit)
        truncated = requested_limit is None and len(dataframe) > len(sorted_dataframe)

        return {
            "operation": operation,
            "column": column,
            "descending": descending,
            "limit": requested_limit,
            "returned_rows": len(sorted_dataframe),
            "truncated": truncated,
            "result": _clean_records(
                sorted_dataframe.to_dict(
                    orient="records"
                )
            ),
        }

    # --------------------------------------------------
    # CORRELATION
    # --------------------------------------------------

    if operation == "correlation":
        columns = plan["columns"]

        correlation_data = dataframe[
            columns
        ]

        correlation = (
            correlation_data
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
        f"Operation '{operation}' is not implemented"
    )