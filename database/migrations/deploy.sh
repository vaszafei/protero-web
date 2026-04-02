#!/bin/bash

# ================================================
# SUPABASE MIGRATION DEPLOYMENT SCRIPT
# ================================================
# Purpose: Deploy missing tables and RPC functions to Supabase
# Date: February 1, 2026
# Safe: All migrations use IF NOT EXISTS / CREATE OR REPLACE

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Supabase Migration Deployment${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check if .env file exists
if [ ! -f "../.env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create .env file with SUPABASE_DB_URL"
  exit 1
fi

# Load environment variables
source ../.env

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}Error: SUPABASE_DB_URL not set in .env${NC}"
  echo "Expected format: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
  exit 1
fi

echo -e "${YELLOW}Database: ${SUPABASE_DB_URL%@*}@***${NC}\n"

# Function to run SQL file
run_migration() {
  local file=$1
  local description=$2
  
  echo -e "${YELLOW}Running: ${description}${NC}"
  echo "File: $file"
  
  if [ ! -f "$file" ]; then
    echo -e "${RED}Error: File not found: $file${NC}"
    return 1
  fi
  
  if psql "$SUPABASE_DB_URL" -f "$file" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Success${NC}\n"
    return 0
  else
    echo -e "${RED}✗ Failed${NC}"
    echo "Run manually in Supabase SQL Editor if psql is not available\n"
    return 1
  fi
}

# Try to use psql if available
if command -v psql &> /dev/null; then
  echo -e "${GREEN}psql found - Running migrations automatically${NC}\n"
  
  # Run migrations in order
  run_migration "supabase_missing_tables.sql" "Adding missing tables (leagues, standings, referees)"
  run_migration "supabase_rpc_functions.sql" "Creating RPC functions for db-maintenance"
  
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}Migration Complete!${NC}"
  echo -e "${GREEN}========================================${NC}\n"
  
  echo "Next steps:"
  echo "1. Test API endpoints: npm run dev"
  echo "2. Test db-maintenance: node bin/db-maintenance.js list-duplicates"
  echo "3. Run data validation"
  
else
  echo -e "${YELLOW}psql not found - Manual deployment required${NC}\n"
  echo "Please run these SQL files in Supabase SQL Editor:"
  echo "1. https://app.supabase.com/project/twkhmatgjeiribbjxkis/sql"
  echo ""
  echo "Files to run (in order):"
  echo "  1. supabase_missing_tables.sql"
  echo "  2. supabase_rpc_functions.sql"
  echo ""
  echo "Files are located at:"
  echo "  $(pwd)/supabase_missing_tables.sql"
  echo "  $(pwd)/supabase_rpc_functions.sql"
fi
