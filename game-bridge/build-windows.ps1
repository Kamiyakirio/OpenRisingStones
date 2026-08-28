# Builds the Windows x64 native payload and Rust host workspace.
[CmdletBinding()]
param(
  [ValidateSet("Debug", "Release")]
  [string]$Configuration = "Release",

  [ValidateSet("MSVC", "ClangCL")]
  [string]$Compiler = "ClangCL",

  [switch]$Clean
)

$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "This build script only supports Windows."
}

$BridgeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildRoot = Join-Path $BridgeRoot "build\windows"
$PayloadBuild = Join-Path $BuildRoot "payload"
$ArtifactRoot = Join-Path $BridgeRoot "artifacts\$Configuration\game-bridge"

if ($Clean -and (Test-Path $BuildRoot)) {
  Remove-Item -Recurse -Force $BuildRoot
}

New-Item -ItemType Directory -Force -Path $PayloadBuild | Out-Null
New-Item -ItemType Directory -Force -Path $ArtifactRoot | Out-Null

$ConfigureArgs = @(
  "-S", (Join-Path $BridgeRoot "payload"),
  "-B", $PayloadBuild,
  "-A", "x64"
)

if ($Compiler -eq "ClangCL") {
  $ConfigureArgs += @("-T", "ClangCL")
}

& cmake @ConfigureArgs
if ($LASTEXITCODE -ne 0) {
  throw "CMake configuration failed."
}

& cmake --build $PayloadBuild --config $Configuration --parallel
if ($LASTEXITCODE -ne 0) {
  throw "C++ payload build failed."
}

$CargoProfile = if ($Configuration -eq "Release") { "release" } else { "dev" }
& cargo build `
  --manifest-path (Join-Path $BridgeRoot "Cargo.toml") `
  --target x86_64-pc-windows-msvc `
  --profile $CargoProfile
if ($LASTEXITCODE -ne 0) {
  throw "Rust host build failed."
}

$PayloadDll = Join-Path $PayloadBuild "$Configuration\game_bridge_payload.dll"
$PayloadPdb = Join-Path $PayloadBuild "$Configuration\game_bridge_payload.pdb"
if (-not (Test-Path $PayloadDll)) {
  throw "C++ payload output was not found."
}

Copy-Item -Force $PayloadDll $ArtifactRoot
if (Test-Path $PayloadPdb) {
  Copy-Item -Force $PayloadPdb $ArtifactRoot
}

$ManifestSource = Join-Path $BridgeRoot "config\manifests"
if (Test-Path $ManifestSource) {
  Copy-Item -Recurse -Force $ManifestSource (Join-Path $ArtifactRoot "manifests")
}
$WorldMapSource = Join-Path $BridgeRoot "config\worlds-cn.json"
if (Test-Path $WorldMapSource) {
  Copy-Item -Force $WorldMapSource $ArtifactRoot
}

Write-Host "Windows artifacts are available at $ArtifactRoot"
