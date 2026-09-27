from app.services.planner import generate_analysis_plan


dataset_profile = {
    "rows": 5,
    "columns": 4,
    "column_details": [
        {
            "name": "Date",
            "data_type": "datetime64[ns]",
        },
        {
            "name": "Product",
            "data_type": "object",
        },
        {
            "name": "Revenue",
            "data_type": "int64",
        },
        {
            "name": "Quantity",
            "data_type": "int64",
        },
    ],
}


question = "Which products generated the most revenue?"


plan = generate_analysis_plan(
    question=question,
    dataset_profile=dataset_profile,
)


print(plan.model_dump())