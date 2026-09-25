import pandas as pd

from app.services.analysis_engine import execute_plan


dataframe = pd.DataFrame(
    {
        "Product": [
            "Laptop",
            "Mouse",
            "Keyboard",
            "Laptop",
            "Monitor",
        ],
        "Revenue": [
            75000,
            2500,
            5000,
            50000,
            30000,
        ],
        "Quantity": [
            3,
            10,
            5,
            2,
            4,
        ],
    }
)


plan = {
    "operation": "group_by",
    "column": "Product",
    "metric_column": "Revenue",
    "aggregation": "sum",
}


result = execute_plan(
    dataframe=dataframe,
    plan=plan,
)


print("\nAnalysis result:")
print(result)