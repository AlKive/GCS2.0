# Database Data Safety Verification Script (PowerShell)
# This script verifies all data protection mechanisms are in place

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔒 GCS DATABASE DATA PROTECTION VERIFICATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check 1: gcs_db_backup.sql
Write-Host "1. Checking gcs_db_backup.sql for DROP statements..." -ForegroundColor Blue
$backupContent = Get-Content "gcs_db_backup.sql" -Raw
if ($backupContent -match "DROP TABLE") {
    Write-Host "✗ WARNING: DROP TABLE statements found!" -ForegroundColor Red
} else {
    Write-Host "✓ Safe: No DROP TABLE statements found" -ForegroundColor Green
}

if ($backupContent -match "IF NOT EXISTS") {
    Write-Host "✓ Safe: Using IF NOT EXISTS clauses" -ForegroundColor Green
} else {
    Write-Host "✗ WARNING: IF NOT EXISTS not found!" -ForegroundColor Red
}
Write-Host ""

# Check 2: setup-db.ts
Write-Host "2. Checking backend/src/setup-db.ts..." -ForegroundColor Blue
$setupContent = Get-Content "backend/src/setup-db.ts" -Raw
if ($setupContent -match "CREATE TABLE IF NOT EXISTS") {
    Write-Host "✓ Safe: Using CREATE TABLE IF NOT EXISTS" -ForegroundColor Green
} else {
    Write-Host "✗ WARNING: CREATE TABLE IF NOT EXISTS not found!" -ForegroundColor Red
}
Write-Host ""

# Check 3: Migration system
Write-Host "3. Checking migration system..." -ForegroundColor Blue
if (Test-Path "backend/src/migrate-db.ts") {
    Write-Host "✓ Present: Migration system exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: Migration system not found" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: Backup/Restore utility
Write-Host "4. Checking backup/restore utility..." -ForegroundColor Blue
if (Test-Path "backend/src/backup-restore.ts") {
    Write-Host "✓ Present: Backup/restore utility exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: Backup/restore utility not found" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Docker compose configuration
Write-Host "5. Checking docker-compose.yaml..." -ForegroundColor Blue
$composeContent = Get-Content "docker-compose.yaml" -Raw
if ($composeContent -match "postgres_data:/var/lib/postgresql/data") {
    Write-Host "✓ Safe: Named volume configured for data persistence" -ForegroundColor Green
} else {
    Write-Host "✗ WARNING: Volume configuration missing!" -ForegroundColor Red
}

if ($composeContent -match "healthcheck:") {
    Write-Host "✓ Safe: Health checks configured" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: Health checks not configured" -ForegroundColor Yellow
}
Write-Host ""

# Check 6: Database Protection Guide
Write-Host "6. Checking documentation..." -ForegroundColor Blue
if (Test-Path "DATABASE_PROTECTION.md") {
    Write-Host "✓ Present: DATABASE_PROTECTION.md exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: DATABASE_PROTECTION.md not found" -ForegroundColor Yellow
}
Write-Host ""

# Check 7: npm scripts
Write-Host "7. Checking npm scripts..." -ForegroundColor Blue
$packageContent = Get-Content "backend/package.json" -Raw
if ($packageContent -match '"db:setup"') {
    Write-Host "✓ Present: db:setup script" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: db:setup script" -ForegroundColor Yellow
}

if ($packageContent -match '"db:backup"') {
    Write-Host "✓ Present: db:backup script" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: db:backup script" -ForegroundColor Yellow
}

if ($packageContent -match '"db:restore"') {
    Write-Host "✓ Present: db:restore script" -ForegroundColor Green
} else {
    Write-Host "⚠ Missing: db:restore script" -ForegroundColor Yellow
}
Write-Host ""

# Check 8: Docker volume persistence
Write-Host "8. Checking Docker volume persistence..." -ForegroundColor Blue
try {
    $volumes = docker volume ls 2>$null | Select-String -Pattern "postgres"
    if ($volumes) {
        Write-Host "✓ Present: PostgreSQL volume found" -ForegroundColor Green
        Write-Host "  $($volumes[0])" -ForegroundColor Gray
        
        # Check volume contents
        $volumeName = $volumes[0] -split '\s+' | Select-Object -Last 1
        $volumeCheck = docker run --rm -v "${volumeName}:/data" alpine ls -la /data/PG_VERSION 2>$null
        if ($volumeCheck) {
            Write-Host "✓ Valid: Volume contains valid PostgreSQL data" -ForegroundColor Green
        } else {
            Write-Host "⚠ Warning: Volume data status unclear" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Info: No running PostgreSQL volume (normal if containers not running)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Docker check skipped" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Data protection verification complete" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 For more information, see: DATABASE_PROTECTION.md" -ForegroundColor Yellow
Write-Host ""

# Recommended next steps
Write-Host "📋 RECOMMENDED NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review the protection guide:" -ForegroundColor White
Write-Host "   cat DATABASE_PROTECTION.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test database setup (safe - no data loss):" -ForegroundColor White
Write-Host "   npm run db:setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Create a backup:" -ForegroundColor White
Write-Host "   npm run db:backup" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Start the application:" -ForegroundColor White
Write-Host "   docker compose up --build" -ForegroundColor Yellow
Write-Host ""
