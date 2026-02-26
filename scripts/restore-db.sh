#!/bin/bash

# Night Watch - Database Restore Script
# Usage: ./restore-db.sh /path/to/backup.sql.gz

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Night Watch Database Restore"
echo "================================"
echo ""

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}✗ Error: No backup file specified${NC}"
    echo ""
    echo "Usage: $0 /path/to/backup.sql.gz"
    echo ""
    echo "Available backups:"
    find /var/backups/night-watch -name "*.sql.gz" -type f -printf "%T@ %Tc %p\n" | sort -rn | head -10 | awk '{print $8}'
    exit 1
fi

BACKUP_FILE=$1

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Configuration
MYSQL_USER="${DB_USER:-root}"
MYSQL_PASSWORD="${DB_PASSWORD}"
MYSQL_DATABASE="${DB_NAME:-night_watch_db}"

if [ -f /.dockerenv ]; then
    MYSQL_HOST="mysql"
else
    MYSQL_HOST="localhost"
fi

echo "⚠️  WARNING: This will replace all data in database: $MYSQL_DATABASE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Create safety backup before restore
echo ""
echo "📦 Creating safety backup..."
SAFETY_BACKUP="/tmp/${MYSQL_DATABASE}_before_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
mysqldump \
    --host="$MYSQL_HOST" \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASSWORD" \
    --single-transaction \
    "$MYSQL_DATABASE" | gzip > "$SAFETY_BACKUP"

echo -e "${GREEN}✓ Safety backup created: $SAFETY_BACKUP${NC}"

# Restore database
echo ""
echo "🔄 Restoring database..."
echo "Source: $BACKUP_FILE"
echo "Target: $MYSQL_DATABASE"
echo ""

if gunzip < "$BACKUP_FILE" | mysql \
    --host="$MYSQL_HOST" \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASSWORD" \
    "$MYSQL_DATABASE"; then
    
    echo -e "${GREEN}✓ Database restored successfully${NC}"
    
    # Verify restore
    echo ""
    echo "🔍 Verifying restore..."
    TABLE_COUNT=$(mysql \
        --host="$MYSQL_HOST" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        --skip-column-names \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE'")
    
    echo "Tables found: $TABLE_COUNT"
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Restore verified${NC}"
    else
        echo -e "${RED}✗ Warning: No tables found after restore${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Restore completed successfully!${NC}"
    echo ""
    echo "Safety backup location: $SAFETY_BACKUP"
    echo "Keep this file in case you need to rollback"
    
else
    echo -e "${RED}✗ Restore failed!${NC}"
    echo ""
    echo "Attempting to restore from safety backup..."
    
    gunzip < "$SAFETY_BACKUP" | mysql \
        --host="$MYSQL_HOST" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        "$MYSQL_DATABASE"
    
    echo -e "${YELLOW}Database rolled back to state before restore attempt${NC}"
    exit 1
fi

exit 0
