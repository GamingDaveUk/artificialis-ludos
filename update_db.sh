#!/bin/bash

echo "========================================="
echo "[SYSTEM] Ludos Database Migration Utility"
echo "========================================="

# Hook Conda into the script and activate the environment
eval "$(conda shell.bash hook)"
conda activate ludos

# Generate an automated timestamp for the migration message
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MIGRATION_MSG="auto_update_${TIMESTAMP}"

echo "[SYSTEM] Generating automated Alembic migration script..."
alembic revision --autogenerate -m "$MIGRATION_MSG"

echo ""
echo "[SYSTEM] Upgrading ludos.db to the latest schema..."
alembic upgrade head

echo ""
echo "[SYSTEM] Database update complete! Your data is safe."
echo "========================================="
