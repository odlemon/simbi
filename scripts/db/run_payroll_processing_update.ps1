# =====================================================
# Run Payroll Processing Database Update Script (PowerShell)
# =====================================================
# Description: Executes SQL script to add payroll processing tables
# Usage: .\run_payroll_processing_update.ps1
# =====================================================

Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "Payroll Processing Database Update" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please set it before running this script:"
    Write-Host "  `$env:DATABASE_URL = 'mysql://user:password@host:port/database'"
    exit 1
}

# SQL script path
$SQL_SCRIPT = "scripts/db/add_payroll_processing.sql"

# Check if SQL script exists
if (-not (Test-Path $SQL_SCRIPT)) {
    Write-Host "Error: SQL script not found at $SQL_SCRIPT" -ForegroundColor Red
    exit 1
}

# Parse DATABASE_URL
$dbUrl = $env:DATABASE_URL

if ($dbUrl -notmatch "^mysql://(.+):(.+)@(.+):(\d+)/(.+)$") {
    Write-Host "Error: Invalid DATABASE_URL format" -ForegroundColor Red
    Write-Host "Expected format: mysql://user:password@host:port/database"
    exit 1
}

$dbUser = $matches[1]
$dbPass = $matches[2]
$dbHost = $matches[3]
$dbPort = $matches[4]
$dbName = $matches[5]

Write-Host "Database: $dbName" -ForegroundColor Green
Write-Host "Host: $dbHost:$dbPort" -ForegroundColor Green
Write-Host "User: $dbUser" -ForegroundColor Green
Write-Host ""

Write-Host "Executing SQL script..." -ForegroundColor Yellow
Write-Host ""

# Read SQL script content
$sqlContent = Get-Content $SQL_SCRIPT -Raw

# Execute SQL using mysql command (if available)
# Note: You may need to adjust this based on your MySQL setup
# Alternative: Use MySQL .NET connector or other method

try {
    # Option 1: If mysql command is in PATH
    $sqlContent | & mysql -h $dbHost -P $dbPort -u $dbUser -p"$dbPass" $dbName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Database update completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Run: npx prisma generate"
        Write-Host "  2. Restart your application server"
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "✗ Database update failed!" -ForegroundColor Red
        Write-Host "Please check the error messages above."
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error: Could not execute MySQL command" -ForegroundColor Red
    Write-Host "Please ensure MySQL client is installed and in your PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Execute the SQL script manually:" -ForegroundColor Yellow
    Write-Host "  mysql -h $dbHost -P $dbPort -u $dbUser -p $dbName < $SQL_SCRIPT"
    Write-Host ""
    Write-Host "Or use a MySQL GUI tool (phpMyAdmin, MySQL Workbench, etc.)" -ForegroundColor Yellow
    exit 1
}






