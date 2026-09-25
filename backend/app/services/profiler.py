import pandas as pd


def profile_dataset(dataframe: pd.DataFrame) -> dict:
    columns = []

    for column in dataframe.columns:
        series = dataframe[column]

        column_info = {
            "name": column,
            "data_type": str(series.dtype),
            "missing": int(series.isna().sum()),
            "missing_percentage": round(
                float(series.isna().mean() * 100),
                2,
            ),
            "unique_values": int(series.nunique()),
        }

        if pd.api.types.is_numeric_dtype(series):
            column_info["statistics"] = {
                "mean": float(series.mean()),
                "median": float(series.median()),
                "min": float(series.min()),
                "max": float(series.max()),
                "standard_deviation": float(series.std()),
            }

        columns.append(column_info)

    return {
        "rows": len(dataframe),
        "columns": len(dataframe.columns),
        "duplicate_rows": int(dataframe.duplicated().sum()),
        "column_details": columns,
    }