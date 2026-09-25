from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(Text)

    file_name: Mapped[str] = mapped_column(Text)

    file_type: Mapped[str] = mapped_column(Text)

    storage_path: Mapped[str] = mapped_column(Text)

    file_size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    row_count: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    column_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        Text,
        default="processing",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
    )