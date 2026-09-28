import math
from typing import Any

import numpy as np
import pandas as pd


def sanitize_for_json(value: Any) -> Any:
    """Convert pandas/NumPy values and non-finite numbers to JSON-safe values."""
    if isinstance(value, dict):
        return {
            key: sanitize_for_json(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [sanitize_for_json(item) for item in value]

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating, float)):
        number = float(value)
        return number if math.isfinite(number) else None

    if isinstance(value, np.bool_):
        return bool(value)

    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return value
