from typing import Literal

from pydantic import BaseModel, Field, model_validator


ScalarValue = str | int | float


class AnalysisPlan(BaseModel):
    operation: Literal[
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
        "between",
    ] | None = None

    value: ScalarValue | list[ScalarValue] | None = None
    comparison_values: list[ScalarValue] | None = None

    descending: bool = False
    rank: bool = False

    limit: int | None = Field(default=None, gt=0, le=1000)

    columns: list[str] | None = None

    period: Literal[
        "day",
        "week",
        "month",
        "quarter",
        "year",
    ] | None = None

    @model_validator(mode="after")
    def validate_operation_fields(self):
        if self.operation in {"group_by", "top_n"}:
            if not self.column:
                raise ValueError(f"{self.operation} requires 'column'")
            if not self.metric_column:
                raise ValueError(f"{self.operation} requires 'metric_column'")
            if not self.aggregation:
                raise ValueError(f"{self.operation} requires 'aggregation'")
            if self.operation == "top_n" and not self.limit:
                raise ValueError("top_n requires 'limit'")

        elif self.operation == "filter":
            if not self.column:
                raise ValueError("filter requires 'column'")
            if not self.operator:
                raise ValueError("filter requires 'operator'")
            if self.value is None:
                raise ValueError("filter requires 'value'")
            if self.operator == "between":
                if not isinstance(self.value, list) or len(self.value) != 2:
                    raise ValueError("between requires exactly two values")

        elif self.operation == "sort":
            if not self.column:
                raise ValueError("sort requires 'column'")

        elif self.operation in {"share"}:
            if not self.column:
                raise ValueError(f"{self.operation} requires 'column'")
            if not self.metric_column:
                raise ValueError(f"{self.operation} requires 'metric_column'")
            if not self.aggregation:
                raise ValueError(f"{self.operation} requires 'aggregation'")

        elif self.operation in {"compare", "difference", "percentage_change"}:
            if not self.column:
                raise ValueError(f"{self.operation} requires 'column'")
            if not self.metric_column:
                raise ValueError(f"{self.operation} requires 'metric_column'")
            if not self.aggregation:
                raise ValueError(f"{self.operation} requires 'aggregation'")
            if not self.comparison_values or len(self.comparison_values) != 2:
                raise ValueError(
                    f"{self.operation} requires exactly two comparison_values"
                )

        elif self.operation == "correlation":
            if not self.columns or len(self.columns) < 2:
                raise ValueError("correlation requires at least 2 columns")

        elif self.operation == "time_group":
            if not self.column:
                raise ValueError("time_group requires 'column'")
            if not self.metric_column:
                raise ValueError("time_group requires 'metric_column'")
            if not self.aggregation:
                raise ValueError("time_group requires 'aggregation'")
            if not self.period:
                raise ValueError("time_group requires 'period'")

        return self


class AnalysisStep(AnalysisPlan):
    id: str = Field(min_length=1, max_length=64)
    input: str | None = None


class AnalysisWorkflow(BaseModel):
    steps: list[AnalysisStep] = Field(min_length=1, max_length=10)

    @model_validator(mode="after")
    def validate_workflow(self):
        step_ids = [step.id for step in self.steps]

        if len(step_ids) != len(set(step_ids)):
            raise ValueError("Workflow step IDs must be unique")

        known_ids = set(step_ids)

        for index, step in enumerate(self.steps):
            if step.input is None:
                continue

            if step.input not in known_ids:
                raise ValueError(
                    f"Step '{step.id}' references unknown input '{step.input}'"
                )

            if step.input == step.id:
                raise ValueError(
                    f"Step '{step.id}' cannot reference itself"
                )

            input_index = step_ids.index(step.input)
            if input_index >= index:
                raise ValueError(
                    f"Step '{step.id}' must reference an earlier step"
                )

        return self


class AnalysisExecuteRequest(BaseModel):
    dataset_id: int = Field(gt=0)
    plan: AnalysisPlan | AnalysisWorkflow
    question: str = Field(min_length=1, max_length=2000)


class AnalysisQuestionRequest(BaseModel):
    dataset_id: int = Field(gt=0)
    question: str = Field(min_length=1, max_length=2000)
