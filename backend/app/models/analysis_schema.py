from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AnalysisPlan(BaseModel):
    operation: Literal[
        "describe",
        "group_by",
        "filter",
        "sort",
        "correlation",
    ]

    column: str | None = None

    metric_column: str | None = None

    aggregation: Literal[
        "sum",
        "mean",
        "min",
        "max",
        "count",
    ] | None = None

    operator: Literal[
        "eq",
        "gt",
        "gte",
        "lt",
        "lte",
    ] | None = None

    value: str | int | float | None = None

    descending: bool = False

    limit: int | None = Field(
        default=None,
        gt=0,
        le=1000,
    )

    columns: list[str] | None = None

    @model_validator(mode="after")
    def validate_operation_fields(self):
        if self.operation == "group_by":
            if not self.column:
                raise ValueError(
                    "group_by requires 'column'"
                )

            if not self.metric_column:
                raise ValueError(
                    "group_by requires 'metric_column'"
                )

            if not self.aggregation:
                raise ValueError(
                    "group_by requires 'aggregation'"
                )

        elif self.operation == "filter":
            if not self.column:
                raise ValueError(
                    "filter requires 'column'"
                )

            if not self.operator:
                raise ValueError(
                    "filter requires 'operator'"
                )

            if self.value is None:
                raise ValueError(
                    "filter requires 'value'"
                )

        elif self.operation == "sort":
            if not self.column:
                raise ValueError(
                    "sort requires 'column'"
                )

        elif self.operation == "correlation":
            if not self.columns:
                raise ValueError(
                    "correlation requires 'columns'"
                )

            if len(self.columns) < 2:
                raise ValueError(
                    "correlation requires at least 2 columns"
                )

        return self


class AnalysisExecuteRequest(BaseModel):
    dataset_id: int = Field(gt=0)

    plan: AnalysisPlan

    question: str = Field(
        min_length=1,
        max_length=2000,
    )

class AnalysisQuestionRequest(BaseModel):
    dataset_id: int = Field(gt=0)
    question: str = Field(
        min_length=1,
        max_length=2000,
    )