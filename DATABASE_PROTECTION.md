# 🔒 Database Data Protection Guide

## Overview

This project implements multiple layers of protection to ensure your database data is **never accidentally deleted or lost**.

---

## 🛡️ Protection Mechanisms

### 1. **Safe SQL Backup File** (`gcs_db_backup.sql`)
- ✅ All `DROP TABLE` and `DROP SEQUENCE` statements have been **removed**
- ✅ All `CREATE TABLE/SEQUENCE` statements use **`IF NOT EXISTS`** clause
- ✅ This file can be safely executed without data loss
- ✅ Original destructive statements are commented for reference only

**What this means:**
```sql
-- SAFE: Will not delete existing data
CREATE TABLE IF NOT EXISTS mission_logs (...)

-- REMOVED: No longer in the file
-- DROP TABLE IF EXISTS mission_logs;
```

### 2. **Smart Database Setup** (`setup-db.ts`)
- ✅ Uses `CREATE TABLE IF NOT EXISTS` for all schema creation
- ✅ Checks if tables already exist before creation
- ✅ Reports existing data row counts
- ✅ Never modifies or deletes existing records
- ✅ Provides detailed safety confirmation messages

**What it does:**
```
Starting: "Creating tables..."
  ✓ mission_logs table already exists - data will be preserved
  ✓ mission_plans table already exists - data will be preserved
  ✓ Database setup complete! All data preserved.
```

### 3. **Migration System** (`migrate-db.ts`)
- ✅ Tracks applied migrations in `_migrations` table
- ✅ Prevents re-running migrations that already executed
- ✅ Safe schema updates without data loss
- ✅ Allows adding new tables/columns without dropping existing ones
- ✅ Clear logging of migration status

**Usage:**
```bash
npm run db:migrate
```

**Output:**
```
✓ [001] Create mission_logs table (already applied)
✓ [002] Create mission_plans table (already applied)
✅ All migrations already applied. Database is up-to-date.
```

### 4. **Backup & Restore Utility** (`backup-restore.ts`)
- ✅ Create timestamped backups of all data
- ✅ Restore from backups with confirmation prompt
- ✅ Requires `--force` flag to prevent accidental restore
- ✅ Data-only backups (safe, doesn't affect schema)

**Backup:**
```bash
npm run db:backup
# Creates: gcs_db_backup_2025-11-23T10-30-45-123Z.sql
```

**Restore:**
```bash
npm run db:restore gcs_db_backup_2025-11-23T10-30-45-123Z.sql --force
```

### 5. **Docker Volume Persistence** (`docker-compose.yaml`)
- ✅ Named volume `postgres_data` survives container restart
- ✅ Volume survives image rebuild
- ✅ Health checks ensure database readiness
- ✅ Labels mark data as critical and backup-required
- ✅ Database host updated to use internal container networking (`db` instead of external IP)

**Docker volume safety:**
```bash
# View all volumes
docker volume ls

# Inspect volume details
docker volume inspect demo-main_postgres_data

# The volume persists even if container is deleted
docker compose down  # Containers stop but volume remains
docker compose up    # Data is still there!
```

---

## 📋 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Initialize Database (Safe)
```bash
npm run db:setup
```
This creates tables without deleting any existing data.

### 3. Run Migrations (Safe)
```bash
npm run db:migrate
```
Applies new schema changes without touching existing records.

### 4. Start Application
```bash
docker compose up --build
```

---

## 🆘 Emergency Recovery

### If database data was accidentally deleted:

1. **Check if you have backups:**
   ```bash
   ls -la ./backups/
   # or
   ls -la gcs_db_backup_*.sql
   ```

2. **Restore from backup:**
   ```bash
   npm run db:restore ./backups/gcs_db_backup_2025-11-23T10-30-45-123Z.sql --force
   ```

3. **If no backup exists:**
   - Docker volume may still have data
   - Check: `docker volume ls | grep postgres`
   - Mount and inspect: `docker run --rm -v demo-main_postgres_data:/data alpine ls -la /data`

---

## ⚠️ Important: Unsafe Operations to AVOID

### ❌ DO NOT run these commands:
```bash
# These will delete all data!
docker compose down -v  # -v removes volumes!
docker volume rm demo-main_postgres_data
```

### ✅ Instead, use:
```bash
# Safe way to stop (preserves data)
docker compose down

# To inspect volume before deleting (if needed)
docker volume inspect demo-main_postgres_data

# To delete ONLY after confirming you have a backup
docker volume rm demo-main_postgres_data  # Only after backup!
```

---

## 🔄 Automatic Backups (Optional Setup)

For production, set up automated backups using cron:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/demo-main && npm run db:backup
```

Or use Docker's backup utilities:
```bash
# Backup using docker exec
docker exec gcs-drone-database pg_dump -U postgres gcs_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📊 Data Status Monitoring

Check current data without connecting to database:

```bash
# View data via API
curl http://localhost:3000/api/missions
curl http://localhost:3000/api/missions/stats
curl http://localhost:3000/api/plans
```

---

## 🎯 Best Practices

1. **Always backup before major changes**
   ```bash
   npm run db:backup
   ```

2. **Review migrations before applying**
   - Check `backend/src/migrate-db.ts` for planned changes
   - Ensure changes are backward-compatible

3. **Use health checks**
   - Docker compose includes health checks
   - Wait for `db` service to be healthy before starting backend

4. **Monitor volume space**
   ```bash
   docker volume ls -q | xargs docker volume inspect | grep -E 'Name|CreatedAt'
   ```

5. **Regular backup rotation**
   - Keep last 7-30 days of backups
   - Test restore periodically
   - Store offsite backups

---

## 🚨 Emergency Contacts / Reference

If something goes wrong:

1. **Check Docker logs:**
   ```bash
   docker compose logs db
   docker compose logs backend
   ```

2. **Verify volume exists:**
   ```bash
   docker volume inspect demo-main_postgres_data
   ```

3. **Test database connection:**
   ```powershell
   ./test-db-connection.ps1
   ```

4. **Review this guide:**
   All protection mechanisms are in place. Follow the recovery steps above.

---

## Summary of Changes

| File | Change | Benefit |
|------|--------|---------|
| `gcs_db_backup.sql` | Removed DROP statements, added `IF NOT EXISTS` | Safe to run without data loss |
| `backend/src/setup-db.ts` | Enhanced with data checks and logging | Clear feedback on data preservation |
| `backend/src/migrate-db.ts` | NEW: Migration tracking system | Safe schema upgrades |
| `backend/src/backup-restore.ts` | NEW: Backup/restore utilities | Data recovery capability |
| `docker-compose.yaml` | Enhanced volume, health checks, networking | Persistent storage, reliability |

---

**Last Updated:** November 23, 2025
**Database Version:** PostgreSQL 16.11
**Status:** 🟢 All data protection mechanisms active
