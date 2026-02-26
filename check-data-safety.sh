#!/usr/bin/env bash
# Database Data Safety Checklist
# This script verifies all data protection mechanisms are in place

echo "═══════════════════════════════════════════════════════════════"
echo "🔒 GCS DATABASE DATA PROTECTION VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check 1: gcs_db_backup.sql
echo -e "${BLUE}1. Checking gcs_db_backup.sql for DROP statements...${NC}"
if grep -q "DROP TABLE" gcs_db_backup.sql; then
    echo -e "${RED}✗ WARNING: DROP TABLE statements found!${NC}"
else
    echo -e "${GREEN}✓ Safe: No DROP TABLE statements found${NC}"
fi

if grep -q "IF NOT EXISTS" gcs_db_backup.sql; then
    echo -e "${GREEN}✓ Safe: Using IF NOT EXISTS clauses${NC}"
else
    echo -e "${RED}✗ WARNING: IF NOT EXISTS not found!${NC}"
fi
echo ""

# Check 2: setup-db.ts
echo -e "${BLUE}2. Checking backend/src/setup-db.ts...${NC}"
if grep -q "CREATE TABLE IF NOT EXISTS" backend/src/setup-db.ts; then
    echo -e "${GREEN}✓ Safe: Using CREATE TABLE IF NOT EXISTS${NC}"
else
    echo -e "${RED}✗ WARNING: CREATE TABLE IF NOT EXISTS not found!${NC}"
fi
echo ""

# Check 3: Migration system
echo -e "${BLUE}3. Checking migration system...${NC}"
if [ -f "backend/src/migrate-db.ts" ]; then
    echo -e "${GREEN}✓ Present: Migration system exists${NC}"
else
    echo -e "${YELLOW}⚠ Missing: Migration system not found${NC}"
fi
echo ""

# Check 4: Backup/Restore utility
echo -e "${BLUE}4. Checking backup/restore utility...${NC}"
if [ -f "backend/src/backup-restore.ts" ]; then
    echo -e "${GREEN}✓ Present: Backup/restore utility exists${NC}"
else
    echo -e "${YELLOW}⚠ Missing: Backup/restore utility not found${NC}"
fi
echo ""

# Check 5: Docker compose configuration
echo -e "${BLUE}5. Checking docker-compose.yaml...${NC}"
if grep -q "postgres_data:/var/lib/postgresql/data" docker-compose.yaml; then
    echo -e "${GREEN}✓ Safe: Named volume configured for data persistence${NC}"
else
    echo -e "${RED}✗ WARNING: Volume configuration missing!${NC}"
fi

if grep -q "healthcheck:" docker-compose.yaml; then
    echo -e "${GREEN}✓ Safe: Health checks configured${NC}"
else
    echo -e "${YELLOW}⚠ Missing: Health checks not configured${NC}"
fi
echo ""

# Check 6: Database Protection Guide
echo -e "${BLUE}6. Checking documentation...${NC}"
if [ -f "DATABASE_PROTECTION.md" ]; then
    echo -e "${GREEN}✓ Present: DATABASE_PROTEATION.md exists${NC}"
else
    echo -e "${YELLOW}⚠ Missing: DATABASE_PROTECTION.md not found${NC}"
fi
echo ""

# Check 7: npm scripts
echo -e "${BLUE}7. Checking npm scripts...${NC}"
if grep -q '"db:setup"' backend/package.json; then
    echo -e "${GREEN}✓ Present: db:setup script${NC}"
else
    echo -e "${YELLOW}⚠ Missing: db:setup script${NC}"
fi

if grep -q '"db:backup"' backend/package.json; then
    echo -e "${GREEN}✓ Present: db:backup script${NC}"
else
    echo -e "${YELLOW}⚠ Missing: db:backup script${NC}"
fi

if grep -q '"db:restore"' backend/package.json; then
    echo -e "${GREEN}✓ Present: db:restore script${NC}"
else
    echo -e "${YELLOW}⚠ Missing: db:restore script${NC}"
fi
echo ""

# Check 8: Volume persistence
echo -e "${BLUE}8. Checking Docker volume persistence...${NC}"
if docker volume ls 2>/dev/null | grep -q "postgres"; then
    VOLUME=$(docker volume ls 2>/dev/null | grep postgres | awk '{print $2}' | head -1)
    echo -e "${GREEN}✓ Present: PostgreSQL volume found: $VOLUME${NC}"
    
    # Check volume contents
    if docker run --rm -v "$VOLUME:/data" alpine ls -la /data/PG_VERSION 2>/dev/null | grep -q "PG_VERSION"; then
        echo -e "${GREEN}✓ Valid: Volume contains valid PostgreSQL data${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Volume data status unclear${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Info: No running PostgreSQL volume (normal if containers not running)${NC}"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Data protection verification complete${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📖 For more information, see: DATABASE_PROTECTION.md"
echo ""