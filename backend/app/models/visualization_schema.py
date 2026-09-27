from typing import Literal

from pydantic import BaseModel, Field


class VisualizationDataPoint(BaseModel):
    label: str
    value: float | int


class VisualizationSpec(BaseModel):
    chart_type: Literal[
        "bar",
        "line",
        "scatter",
        "pie",
    ]

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    x_axis: str | None = None

    y_axis: str | None = None

    data: list[VisualizationDataPoint] = Field(
        default_factory=list,
    )