#!/bin/bash

# =====================================================
# Run Payroll Processing Database Update Script
# =====================================================
# Description: Executes SQL script to add payroll processing tables
# Usage: ./run_payroll_processing_update.sh
# =====================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=====================================================${NC}"
echo -e "${YELLOW}Payroll Processing Database Update${NC}"
echo -e "${YELLOW}=====================================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set it before running this script:"
    echo "  export DATABASE_URL='mysql://user:password@host:port/database'"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_URL=$DATABASE_URL

# Parse DATABASE_URL (basic parsing)
# Note: This is a simple parser, adjust if your URL format differs
if [[ $DB_URL == mysql://* ]]; then
    # Remove mysql:// prefix
    DB_URL=${DB_URL#mysql://}
    
    # Extract parts
    USER_PASS=$(echo $DB_URL | cut -d'@' -f1)
    HOST_DB=$(echo $DB_URL | cut -d'@' -f2)
    
    DB_USER=$(echo $USER_PASS | cut -d':' -f1)
    DB_PASS=$(echo $USER_PASS | cut -d':' -f2)
    DB_HOST=$(echo $HOST_DB | cut -d':' -f1)
    DB_PORT=$(echo $HOST_DB | cut -d':' -f2 | cut -d'/' -f1)
    DB_NAME=$(echo $HOST_DB | cut -d'/' -f2)
    
    echo -e "${GREEN}Database:${NC} $DB_NAME"
    echo -e "${GREEN}Host:${NC} $DB_HOST:$DB_PORT"
    echo -e "${GREEN}User:${NC} $DB_USER"
    echo ""
else
    echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
    echo "Expected format: mysql://user:password@host:port/database"
    exit 1
fi

# SQL script path
SQL_SCRIPT="scripts/db/add_payroll_processing.sql"

# Check if SQL script exists
if [ ! -f "$SQL_SCRIPT" ]; then
    echo -e "${RED}Error: SQL script not found at $SQL_SCRIPT${NC}"
    exit 1
fi

echo -e "${YELLOW}Executing SQL script...${NC}"
echo ""

# Execute SQL script
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_SCRIPT"

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database update completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run: npx prisma generate"
    echo "  2. Restart your application server"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Database update failed!${NC}"
    echo "Please check the error messages above."
    exit 1
fi



