LOG_DIR="./winston"
BACKUP_DIR="./winston-backups"
CURRENT_DATE=$(date +%Y-%m-%d)

echo "🧹 Starting log cleanup - $CURRENT_DATE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to cleanup old logs
cleanup_logs() {
    local dir=$1
    local days=$2
    
    echo "📂 Cleaning up logs in $dir older than $days days"
    
    # Find and compress logs older than specified days
    find "$dir" -name "*.log" -type f -mtime +$days -exec gzip {} \;
    
    # Remove compressed logs older than 30 days
    find "$dir" -name "*.gz" -type f -mtime +30 -delete
    
    # Count remaining files
    local count=$(find "$dir" -type f | wc -l)
    echo "✅ $count log files remaining in $dir"
}

# Cleanup success logs (keep 3 days uncompressed, 30 days compressed)
if [ -d "$LOG_DIR/success" ]; then
    cleanup_logs "$LOG_DIR/success" 3
fi

# Cleanup error logs (keep 7 days uncompressed, 60 days compressed)  
if [ -d "$LOG_DIR/error" ]; then
    echo "📂 Cleaning up error logs (kept longer for debugging)"
    find "$LOG_DIR/error" -name "*.log" -type f -mtime +7 -exec gzip {} \;
    find "$LOG_DIR/error" -name "*.gz" -type f -mtime +60 -delete
    local count=$(find "$LOG_DIR/error" -type f | wc -l)
    echo "✅ $count error log files remaining"
fi

# Show disk usage
echo "💾 Current winston directory size:"
du -sh "$LOG_DIR"

echo "🎉 Log cleanup completed - $CURRENT_DATE"