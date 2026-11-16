param(
    [Parameter(Mandatory = $true)][string]$Archive,
    [Parameter(Mandatory = $true)][string]$ExpectedArchiveSha256
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
if ($env:OS -ne 'Windows_NT') { throw 'A real Windows host is required.' }
$expectedExe = 'a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba'
if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedArchiveSha256) {
    throw 'Uploaded ZIP hash mismatch.'
}
$destination = Join-Path (Split-Path -Parent $Archive) 'app'
if (Test-Path -LiteralPath $destination) { throw 'Deployment directory already exists; use a fresh run.' }
Expand-Archive -LiteralPath $Archive -DestinationPath $destination
$basePath = [IO.Path]::GetFullPath($destination) + [IO.Path]::DirectorySeparatorChar
$manifest = Get-Content -LiteralPath (Join-Path $destination 'ETCAD-REA-MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.exe_sha256 -ne $expectedExe) { throw 'Unexpected target in manifest.' }
$checked = 0
foreach ($file in $manifest.files) {
    if ([IO.Path]::IsPathRooted($file.path) -or $file.path -match '(^|[/\\])\.\.([/\\]|$)|:') {
        throw 'Unsafe manifest path.'
    }
    $path = [IO.Path]::GetFullPath((Join-Path $destination $file.path))
    if (-not $path.StartsWith($basePath, [StringComparison]::OrdinalIgnoreCase)) { throw 'Path escapes deployment.' }
    if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) {
        throw "Application file hash mismatch: $($file.path)"
    }
    $checked++
}
$exe = Join-Path $destination 'ETCOM_PSV.exe'
if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedExe) { throw 'EXE changed.' }
$os = Get-CimInstance Win32_OperatingSystem
$machine = Get-CimInstance Win32_ComputerSystem
$receipt = [ordered]@{
    stage = 'FILES_DEPLOYED'; native_gui_verdict = 'NOT_RUN'
    os = $os.Caption; os_version = $os.Version; os_build = $os.BuildNumber
    os_64_bit = [Environment]::Is64BitOperatingSystem
    logical_cpus = $machine.NumberOfLogicalProcessors
    memory_gib = [Math]::Round($machine.TotalPhysicalMemory / 1GB, 2)
    culture = (Get-Culture).Name; ui_culture = (Get-UICulture).Name
    app_directory = $destination; exe = $exe; checked_files = $checked
    exe_sha256 = $expectedExe
}
$receipt | ConvertTo-Json -Depth 5
# Launch via AgentBay computer.start_app so it targets the interactive desktop.
# This file only deploys verified bytes; it never declares GUI or save/reopen PASS.
