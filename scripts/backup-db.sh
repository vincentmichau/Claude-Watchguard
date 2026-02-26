#!/bin/bash

# Night Watch - Automatic MySQL Backup Script
# Usage: ./backup-db.sh [daily|weekly|monthly]

set -e

# Configuration
BACKUP_DIR="/var/backups/night-watch"
MYSQL_USER="${DB_USER:-root}"
MYSQL_PASSWORD="${DB_PASSWORD}"
MYSQL_DATABASE="${DB_NAME:-night_watch_db}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE=${1:-daily}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔐 Night Watch Database Backup"
echo "==============================="
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    MYSQL_HOST="mysql"
else
    MYSQL_HOST="localhost"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_TYPE"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/$BACKUP_TYPE/${MYSQL_DATABASE}_${BACKUP_TYPE}_${DATE}.sql.gz"

echo "📦 Creating backup..."
echo "Type: $BACKUP_TYPE"
echo "Database: $MYSQL_DATABASE"
echo "File: $BACKUP_FILE"
echo ""

# Perform backup
if mysqldump \
    --host="$MYSQL_HOST" \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$MYSQL_DATABASE" | gzip > "$BACKUP_FILE"; then
    
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Size: $SIZE"
    
    # Verify backup
    if [ -s "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✓ Backup file verified${NC}"
    else
        echo -e "${RED}✗ Backup file is empty!${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

# Cleanup old backups
echo ""
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR/$BACKUP_TYPE" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR/$BACKUP_TYPE" -name "*.sql.gz" | wc -l)
echo "Remaining backups: $REMAINING"

# Upload to remote storage (optional)
if [ ! -z "$BACKUP_REMOTE_PATH" ]; then
    echo ""
    echo "☁️  Uploading to remote storage..."
    # Add your remote upload command here
    # Examples:
    # rsync -avz "$BACKUP_FILE" "$BACKUP_REMOTE_PATH"
    # aws s3 cp "$BACKUP_FILE" "s3://your-bucket/backups/"
    # rclone copy "$BACKUP_FILE" "remote:backups/"
fi

# Send notification (optional)
if [ ! -z "$BACKUP_NOTIFICATION_EMAIL" ]; then
    echo ""
    echo "📧 Sending notification..."
    echo "Backup completed successfully: $BACKUP_FILE" | \
        mail -s "Night Watch Backup - $BACKUP_TYPE" "$BACKUP_NOTIFICATION_EMAIL"
fi

echo ""
echo -e "${GREEN}✅ Backup process completed successfully!${NC}"
echo ""
echo "📋 Backup details:"
echo "   Location: $BACKUP_FILE"
echo "   Size: $SIZE"
echo "   Date: $(date)"

# Exit successfully
exit 0
