from app.services.insight_generator import generate_insight


question = "Which product generated the most revenue?"

result = {
    "operation": "group_by",
    "group_column": "Product",
    "metric_column": "Revenue",
    "aggregation": "sum",
    "result": [
        {
            "Product": "Keyboard",
            "Revenue": 5000,
        },
        {
            "Product": "Laptop",
            "Revenue": 125000,
        },
        {
            "Product": "Monitor",
            "Revenue": 30000,
        },
        {
            "Product": "Mouse",
            "Revenue": 2500,
        },
    ],
}


insight = generate_insight(
    question=question,
    result=result,
)

print("\nGenerated insight:")
print(insight)