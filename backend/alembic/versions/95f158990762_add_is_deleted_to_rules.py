"""add_is_deleted_to_rules

Revision ID: 95f158990762
Revises: b2c3d4e5f6a7
Create Date: 2025-12-24 11:09:14.325921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95f158990762'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('rules', sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('rules', 'is_deleted')
