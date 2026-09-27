import pandas as pd

MAX_DATAFRAME_MEMORY_BYTES = 512 * 1024 * 1024
MAX_COLUMNS = 500
MAX_RESULT_ROWS = 5000


def validate_dataframe_resources(dataframe: pd.DataFrame) -> None:
    column_count = len(dataframe.columns)

    if column_count > MAX_COLUMNS:
        raise ValueError(
            f"Dataset contains {column_count} columns. "
            f"Please use a dataset with {MAX_COLUMNS} columns or fewer."
        )

    memory_usage = int(
        dataframe.memory_usage(index=True, deep=True).sum()
    )

    if memory_usage > MAX_DATAFRAME_MEMORY_BYTES:
        memory_mb = round(memory_usage / (1024 * 1024), 1)
        limit_mb = MAX_DATAFRAME_MEMORY_BYTES // (1024 * 1024)
        raise ValueError(
            f"Dataset requires approximately {memory_mb} MB of memory "
            f"after loading. The current processing capacity is {limit_mb} MB."
        )


def truncate_result(
    dataframe: pd.DataFrame,
    limit: int = MAX_RESULT_ROWS,
) -> tuple[pd.DataFrame, bool]:
    if len(dataframe) <= limit:
        return dataframe, False
    return dataframe.head(limit), True
