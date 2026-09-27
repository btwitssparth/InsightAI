from app.services.visualization import (
    generate_visualization,
)


result = {
    "operation": "group_by",
    "group_column": "Product",
    "metric_column": "Revenue",
    "aggregation": "sum",
    "descending": True,
    "limit": 10,
    "result": [
        {
            "Product": "Laptop",
            "Revenue": 125000,
        },
        {
            "Product": "Monitor",
            "Revenue": 30000,
        },
        {
            "Product": "Keyboard",
            "Revenue": 5000,
        },
        {
            "Product": "Mouse",
            "Revenue": 2500,
        },
    ],
    "group_count": 4,
}


visualization = generate_visualization(
    result
)


print(
    visualization.model_dump()
)