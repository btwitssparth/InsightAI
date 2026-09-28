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
    # DIFFERENCE
    # --------------------------------------------------

    if operation == "difference":
        records = result.get("result", [])
        if not records:
            return None
        data = []
        for record in records:
            label = record.get("category")
            value = record.get("value")
            if label is not None and isinstance(value, (int, float)):
                data.append({"label": str(label), "value": value})
        if not data:
            return None
        metric_column = result.get("metric_column", "Value")
        comparison_values = result.get("comparison_values", [])
        title = f"{metric_column} Comparison"
        if len(comparison_values) == 2:
            title = f"{comparison_values[0]} vs {comparison_values[1]}: {metric_column}"
        return VisualizationSpec(chart_type="bar", title=title, x_axis=result.get("group_column", "Category"), y_axis=metric_column, data=data)

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