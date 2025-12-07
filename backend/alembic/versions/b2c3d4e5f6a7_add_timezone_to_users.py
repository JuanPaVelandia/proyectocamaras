"""Add timezone to users

Revision ID: b2c3d4e5f6a7
Revises: 87aef9680959
Create Date: 2025-12-07 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '87aef9680959'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add timezone column to users table"""
    # Verificar si la columna ya existe antes de agregarla
    from sqlalchemy import inspect
    from sqlalchemy.engine import reflection
    
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'timezone' not in columns:
        op.add_column('users', sa.Column('timezone', sa.String(length=50), server_default='UTC', nullable=True))


def downgrade() -> None:
    """Remove timezone column from users table"""
    op.drop_column('users', 'timezone')

