# Сборка подписанных APK для RuStore и AAB для Google Play существующим ключом подписи.
# Путь к ключу, alias и пароли спрашиваются в этом окне (пароли — скрытым вводом),
# живут только в этом процессе и не попадают в файлы, логи или Git.
# Запуск: pwsh -NoProfile -ExecutionPolicy Bypass -File mobile/scripts/release-android.ps1
param([string]$OutDir)
$ErrorActionPreference = 'Stop'
$mobile = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $mobile 'app.json') -Raw | ConvertFrom-Json).expo.version
if (-not $OutDir) { $OutDir = Join-Path $env:USERPROFILE "Documents\Atmos Release\$version-$(Get-Date -Format yyyy-MM-dd)" }

function Read-Secret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

Write-Host "Сборка «Погода и что надеть» $version для RuStore и Google Play" -ForegroundColor Cyan
if (-not $env:ATMOS_KEYSTORE) { $env:ATMOS_KEYSTORE = (Read-Host 'Путь к файлу ключа (.jks или .keystore)').Trim('"', ' ') }
if (-not (Test-Path -LiteralPath $env:ATMOS_KEYSTORE)) { throw "Файл ключа не найден: $env:ATMOS_KEYSTORE" }
if (-not $env:ATMOS_KEY_ALIAS) { $env:ATMOS_KEY_ALIAS = Read-Host 'Alias ключа' }
if (-not $env:ATMOS_STORE_PASSWORD) { $env:ATMOS_STORE_PASSWORD = Read-Secret 'Пароль хранилища ключей' }
if (-not $env:ATMOS_KEY_PASSWORD) {
  $env:ATMOS_KEY_PASSWORD = Read-Secret 'Пароль ключа (Enter — такой же)'
  if (-not $env:ATMOS_KEY_PASSWORD) { $env:ATMOS_KEY_PASSWORD = $env:ATMOS_STORE_PASSWORD }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$builds = @(
  @{ Store = 'rustore'; From = 'android\app\build\outputs\apk\release\app-release.apk'; To = "Pogoda-i-chto-nadet-$version-rustore.apk" },
  @{ Store = 'google-play'; From = 'android\app\build\outputs\bundle\release\app-release.aab'; To = "Pogoda-i-chto-nadet-$version-google-play.aab" }
)
foreach ($build in $builds) {
  Write-Host "`n=== $($build.Store) ===" -ForegroundColor Cyan
  $artifact = Join-Path $mobile $build.From
  Remove-Item -LiteralPath $artifact -ErrorAction SilentlyContinue
  & node (Join-Path $mobile 'scripts\build-store.cjs') $build.Store
  if ($LASTEXITCODE -ne 0) { throw "Сборка $($build.Store) завершилась с ошибкой $LASTEXITCODE" }
  Copy-Item -LiteralPath $artifact -Destination (Join-Path $OutDir $build.To) -Force
}
Write-Host "`nГотово: $OutDir" -ForegroundColor Green
Get-ChildItem -LiteralPath $OutDir -File | ForEach-Object { '{0,8:N1} МБ  {1}' -f ($_.Length / 1MB), $_.Name }
