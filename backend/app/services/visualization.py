from app.models.visualization_schema import (
    VisualizationSpec,
)


def generate_visualization(
    result: dict,
) -> VisualizationSpec | None:

    operation = result.get("operation")

    # --------------------------------------------------
    # GROUP BY
    # --------------------------------------------------

    if operation in {"group_by", "top_n"}:
        records = result.get(
            "result",
            [],
        )

        if not records:
            return None

        group_column = result.get(
            "group_column"
        )

        metric_column = result.get(
            "metric_column"
        )

        if not group_column or not metric_column:
            return None

        data = []

        for record in records:
            label = record.get(
                group_column
            )

            value = record.get(
                metric_column
            )

            if label is None or value is None:
                continue

            if not isinstance(
                value,
                (int, float),
            ):
                continue

            data.append(
                {
                    "label": str(label),
                    "value": value,
                }
            )

        if not data:
            return None

        aggregation = result.get(
            "aggregation"
        )

        aggregation_labels = {
            "sum": "Total",
            "mean": "Average",
            "min": "Minimum",
            "max": "Maximum",
            "count": "Count",
        }

        metric_label = aggregation_labels.get(
            aggregation,
            "Value",
        )

        return VisualizationSpec(
            chart_type="bar",
            title=f"{metric_label} {metric_column} by {group_column}",
            x_axis=group_column,
            y_axis=metric_column,
            data=data,
        )

    # --------------------------------------------------
    # SHARE
    # --------------------------------------------------

    if operation == "share":
        records = result.get("result", [])
        if not records:
            return None

        data = []
        for record in records:
            label = record.get("category")
            share = record.get("percentage_share")
            if label is None or share is None:
                continue
            if not isinstance(share, (int, float)):
                continue
            data.append({"label": str(label), "value": share})

        if not data:
            return None

        group_column = result.get("group_column", "Category")
        metric_column = result.get("metric_column", "Value")

        return VisualizationSpec(
            chart_type="pie",
            title=f"{metric_column} Share by {group_column}",
            x_axis=group_column,
            y_axis="Percentage Share",
            data=data,
        )

    # --------------------------------------------------
    # SORT
    # --------------------------------------------------

    if operation == "sort":
        records = result.get(
            "result",
            [],
        )

        if not records:
            return None

        column = result.get(
            "column"
        )

        if not column:
            return None

        data = []

        for index, record in enumerate(records):
            value = record.get(column)

            if value is None:
                continue

            if not isinstance(
                value,
                (int, float),
            ):
                continue

            data.append(
                {
                    "label": str(
                        index + 1
                    ),
                    "value": value,
                }
            )

        if not data:
            return None

        direction = (
            "Highest"
            if result.get("descending")
            else "Lowest"
        )

        return VisualizationSpec(
            chart_type="bar",
            title=f"{direction} {column}",
            x_axis="Rank",
            y_axis=column,
            data=data,
        )

    # --------------------------------------------------
    # CHANGE / COMPARISON
    # --------------------------------------------------

    if operation in {"difference", "percentage_change"}:
        records = result.get("result", [])
        if not records:
            return None
        data = [
            {"label": str(record.get("category")), "value": record.get("value")}
            for record in records
            if record.get("category") is not None
            and isinstance(record.get("value"), (int, float))
        ]
        if not data:
            return None
        metric = result.get("metric_column", "Value")
        values = result.get("comparison_values", [])
        title = f"{metric} Comparison"
        if len(values) == 2:
            title = f"{values[0]} vs {values[1]}: {metric}"
        return VisualizationSpec(
            chart_type="bar",
            title=title,
            x_axis=result.get("group_column", "Category"),
            y_axis=metric,
            data=data,
        )

    # --------------------------------------------------
    # TIME GROUP
    # --------------------------------------------------

    if operation == "time_group":
        records = result.get("result", [])
        if not records:
            return None
        data = [
            {"label": str(record.get("period")), "value": record.get("value")}
            for record in records
            if record.get("period") is not None
            and isinstance(record.get("value"), (int, float))
        ]
        if not data:
            return None
        period = result.get("period", "period")
        metric = result.get("metric_column", "Value")
        return VisualizationSpec(
            chart_type="line",
            title=f"{metric} by {period}",
            x_axis="Period",
            y_axis=metric,
            data=data,
        )

    # CORRELATION
    # --------------------------------------------------

    if operation == "correlation":
        columns = result.get(
            "columns",
            []
        )

        correlation_result = result.get(
            "result",
            {}
        )

        if len(columns) < 2:
            return None

        first_column = columns[0]
        second_column = columns[1]

        first_values = correlation_result.get(
            first_column,
            {}
        )

        correlation_value = first_values.get(
            second_column
        )

        if correlation_value is None:
            return None

        return VisualizationSpec(
            chart_type="bar",
            title=(
                f"Correlation: "
                f"{first_column} vs {second_column}"
            ),
            x_axis="Variables",
            y_axis="Correlation",
            data=[
                {
                    "label": (
                        f"{first_column} vs "
                        f"{second_column}"
                    ),
                    "value": correlation_value,
                }
            ],
        )

    # --------------------------------------------------
    # DESCRIBE / FILTER
    # --------------------------------------------------

    return None