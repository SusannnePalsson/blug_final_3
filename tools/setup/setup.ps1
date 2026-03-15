param(
  [switch]$SeedAdminPrompt,
  [string]$SeedAdminPassword = "",
  [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin",
  [string]$DbHost = "localhost",
  [int]$DbPort = 5432,
  [string]$DbUser = "postgres",
  [string]$DbName = "blug",
  [string]$CreateDbSql = "",
  [string]$InitSql = "",
  [string]$SeedAdminSql = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($CreateDbSql -eq "") { $CreateDbSql = Join-Path $ProjectRoot "Blug.Database\create_database.sql" }
if ($InitSql     -eq "") { $InitSql     = Join-Path $ProjectRoot "Blug.Database\migrations\001_init.sql" }
if ($SeedAdminSql -eq "") { $SeedAdminSql = Join-Path $ProjectRoot "Blug.Database\migrations\003_seed_admin.sql" }

$psql = Join-Path $PgBin "psql.exe"
if (!(Test-Path $psql)) {
  Write-Host "Could not find psql at: $psql" -ForegroundColor Red
  Write-Host "Set -PgBin to your PostgreSQL bin folder." -ForegroundColor Yellow
  exit 1
}

Write-Host "Using psql: $psql"
Write-Host "Project root: $ProjectRoot"
Write-Host "Host: $DbHost Port: $DbPort User: $DbUser DB: $DbName"

Write-Host "`n[1/3] Creating database (if not exists)..." -ForegroundColor Cyan
& $psql -h $DbHost -p $DbPort -U $DbUser -d postgres -f $CreateDbSql

Write-Host "`n[2/3] Running 001_init.sql..." -ForegroundColor Cyan
& $psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $InitSql

if (Test-Path $SeedAdminSql) {
  Write-Host "`n[3/3] Running 003_seed_admin.sql (optional)..." -ForegroundColor Cyan
  try {
    & $psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SeedAdminSql
  } catch {
    Write-Host "Admin SQL seed failed (OK if not configured)." -ForegroundColor Yellow
  }
}

if ($SeedAdminPassword -ne "") {
  Write-Host "`n[3b] Seeding admin via Node script..." -ForegroundColor Cyan
  Push-Location $ProjectRoot
  node .\scripts\seed-admin.mjs --username admin --email admin@blug.local --password "$SeedAdminPassword"
  Pop-Location
}

if ($SeedAdminPrompt) {
  Write-Host "`n[3c] Seeding admin via interactive prompt..." -ForegroundColor Cyan
  Push-Location $ProjectRoot

  $apiDir = Join-Path $ProjectRoot "Blug.Api"
  $nodeModules = Join-Path $apiDir "node_modules"
  $pkgJson = Join-Path $apiDir "package.json"

  if (!(Test-Path $pkgJson)) {
    Write-Host "Skipped: Could not find Blug.Api/package.json." -ForegroundColor Yellow
  }
  elseif (!(Test-Path $nodeModules)) {
    Write-Host "Skipped admin prompt seed because node_modules is missing." -ForegroundColor Yellow
    Write-Host "Run:" -ForegroundColor Yellow
    Write-Host "  cd `"$apiDir`"" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Yellow
    Write-Host "Then re-run:" -ForegroundColor Yellow
    Write-Host "  cd `"$PSScriptRoot`"" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1 -SeedAdminPrompt" -ForegroundColor Yellow
  }
  else {
    try {
      node (Join-Path $ProjectRoot "scripts\seed-admin-prompt.mjs") --username admin --email admin@blug.local
    } catch {
      Write-Host "Admin prompt seed failed. You can seed via SQL or rerun after fixing npm deps." -ForegroundColor Yellow
    }
  }

  Pop-Location
}

Write-Host "`nDone." -ForegroundColor Green
