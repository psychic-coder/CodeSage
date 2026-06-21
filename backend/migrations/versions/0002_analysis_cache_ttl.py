"""Add expires_at to AnalysisCache

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-21 11:53:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001_initial'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('analysis_cache', sa.Column('expires_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('analysis_cache', 'expires_at')
