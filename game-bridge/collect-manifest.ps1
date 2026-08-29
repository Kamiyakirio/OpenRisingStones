# Generates a versioned manifest from a local Windows game executable.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$GamePath,

  [string]$TemplatePath = (Join-Path $PSScriptRoot "config\version-manifest.template.json"),

  [string]$OutputPath,

  [string]$ExpectedVersion,

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "This collector only supports Windows."
}

function Assert-Range {
  param(
    [long]$Offset,
    [long]$Length,
    [long]$TotalLength,
    [string]$Label
  )

  if ($Offset -lt 0 -or $Length -lt 0 -or $Offset -gt $TotalLength -or $Length -gt ($TotalLength - $Offset)) {
    throw "$Label is outside the executable file."
  }
}

function Read-UInt16 {
  param([byte[]]$Bytes, [long]$Offset, [string]$Label)
  Assert-Range $Offset 2 $Bytes.LongLength $Label
  return [BitConverter]::ToUInt16($Bytes, [int]$Offset)
}

function Read-UInt32 {
  param([byte[]]$Bytes, [long]$Offset, [string]$Label)
  Assert-Range $Offset 4 $Bytes.LongLength $Label
  return [BitConverter]::ToUInt32($Bytes, [int]$Offset)
}

function Read-Int32 {
  param([byte[]]$Bytes, [long]$Offset, [string]$Label)
  Assert-Range $Offset 4 $Bytes.LongLength $Label
  return [BitConverter]::ToInt32($Bytes, [int]$Offset)
}

function Get-LowerHex {
  param([byte[]]$Bytes)
  return [BitConverter]::ToString($Bytes).Replace("-", "").ToLowerInvariant()
}

function Get-Sha256 {
  param([byte[]]$Bytes)

  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return Get-LowerHex ($algorithm.ComputeHash($Bytes))
  }
  finally {
    $algorithm.Dispose()
  }
}

function Resolve-GameFiles {
  param([string]$InputPath)

  $resolved = (Resolve-Path -LiteralPath $InputPath).Path
  $item = Get-Item -LiteralPath $resolved
  $candidates = [Collections.Generic.List[string]]::new()
  if ($item.PSIsContainer) {
    $candidates.Add((Join-Path $item.FullName "ffxiv_dx11.exe"))
    $candidates.Add((Join-Path $item.FullName "game\ffxiv_dx11.exe"))
  }
  else {
    $candidates.Add($item.FullName)
  }

  $executable = $null
  foreach ($candidate in $candidates) {
    if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and
        [IO.Path]::GetFileName($candidate).Equals("ffxiv_dx11.exe", [StringComparison]::OrdinalIgnoreCase)) {
      $executable = Get-Item -LiteralPath $candidate
      break
    }
  }
  if ($null -eq $executable) {
    throw "ffxiv_dx11.exe was not found under the provided path."
  }

  $versionFile = Join-Path $executable.Directory.FullName "ffxivgame.ver"
  if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf)) {
    throw "ffxivgame.ver was not found next to the executable."
  }

  return [pscustomobject]@{
    Executable = $executable
    VersionFile = Get-Item -LiteralPath $versionFile
  }
}

function Get-PeImage {
  param([IO.FileInfo]$Executable)

  $bytes = [IO.File]::ReadAllBytes($Executable.FullName)
  if ($bytes.LongLength -gt [int]::MaxValue) {
    throw "The executable is too large for this collector."
  }
  if ((Read-UInt16 $bytes 0 "DOS signature") -ne 0x5A4D) {
    throw "The executable has an invalid DOS signature."
  }

  $peOffset = Read-UInt32 $bytes 0x3C "PE header offset"
  Assert-Range $peOffset 24 $bytes.LongLength "PE header"
  if ((Read-UInt32 $bytes $peOffset "PE signature") -ne 0x00004550) {
    throw "The executable has an invalid PE signature."
  }
  if ((Read-UInt16 $bytes ($peOffset + 4) "machine type") -ne 0x8664) {
    throw "The executable is not a Windows x64 image."
  }

  $sectionCount = Read-UInt16 $bytes ($peOffset + 6) "section count"
  $optionalHeaderSize = Read-UInt16 $bytes ($peOffset + 20) "optional header size"
  $optionalHeaderOffset = $peOffset + 24
  Assert-Range $optionalHeaderOffset $optionalHeaderSize $bytes.LongLength "optional header"
  if ((Read-UInt16 $bytes $optionalHeaderOffset "optional header magic") -ne 0x020B) {
    throw "The executable does not have a PE32+ optional header."
  }
  $imageSize = Read-UInt32 $bytes ($optionalHeaderOffset + 56) "image size"
  $sectionTableOffset = $optionalHeaderOffset + $optionalHeaderSize
  Assert-Range $sectionTableOffset ([long]$sectionCount * 40) $bytes.LongLength "section table"

  $textSection = $null
  for ($index = 0; $index -lt $sectionCount; $index++) {
    $sectionOffset = $sectionTableOffset + ($index * 40)
    $name = [Text.Encoding]::ASCII.GetString($bytes, [int]$sectionOffset, 8).TrimEnd([char[]]@([char]0))
    if ($name -ne ".text") {
      continue
    }

    $virtualSize = Read-UInt32 $bytes ($sectionOffset + 8) ".text virtual size"
    $virtualAddress = Read-UInt32 $bytes ($sectionOffset + 12) ".text RVA"
    $rawSize = Read-UInt32 $bytes ($sectionOffset + 16) ".text raw size"
    $rawOffset = Read-UInt32 $bytes ($sectionOffset + 20) ".text raw offset"
    Assert-Range $rawOffset $rawSize $bytes.LongLength ".text raw data"
    if ($rawSize -eq 0 -or $virtualSize -eq 0) {
      throw "The executable .text section is empty."
    }
    if ($virtualSize -gt [int]::MaxValue) {
      throw "The executable .text virtual size is too large for this collector."
    }

    $textBytes = [byte[]]::new([int]$rawSize)
    [Array]::Copy($bytes, [long]$rawOffset, $textBytes, 0, [long]$rawSize)
    $scanBytes = [byte[]]::new([int]$virtualSize)
    $scanLength = [Math]::Min([long]$rawSize, [long]$virtualSize)
    [Array]::Copy($textBytes, 0, $scanBytes, 0, $scanLength)
    $textSection = [pscustomobject]@{
      Bytes = $textBytes
      ScanBytes = $scanBytes
      RawOffset = [uint32]$rawOffset
      RawSize = [uint32]$rawSize
      VirtualAddress = [uint32]$virtualAddress
      VirtualSize = [uint32]$virtualSize
    }
    break
  }

  if ($null -eq $textSection) {
    throw "The executable does not contain a .text section."
  }

  return [pscustomobject]@{
    Bytes = $bytes
    ImageSize = [uint32]$imageSize
    Text = $textSection
  }
}

function Convert-Signature {
  param([string]$Pattern)

  $tokens = @($Pattern.Trim() -split '\s+')
  if ($tokens.Count -eq 0) {
    throw "A manifest signature is empty."
  }

  $bytes = [byte[]]::new($tokens.Count)
  $wildcards = [bool[]]::new($tokens.Count)
  for ($index = 0; $index -lt $tokens.Count; $index++) {
    $token = $tokens[$index]
    if ($token -eq "?" -or $token -eq "??") {
      $wildcards[$index] = $true
      continue
    }
    if ($token -notmatch '^[0-9A-Fa-f]{2}$') {
      throw "Invalid signature token: $token"
    }
    $bytes[$index] = [Convert]::ToByte($token, 16)
  }

  return [pscustomobject]@{
    Bytes = $bytes
    Wildcards = $wildcards
  }
}

if ($null -eq ("GameBridge.ManifestScanner" -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;

namespace GameBridge
{
    public static class ManifestScanner
    {
        public static int[] Find(byte[] data, byte[] pattern, bool[] wildcards, int maximumMatches)
        {
            if (data == null || pattern == null || wildcards == null)
                throw new ArgumentNullException();
            if (pattern.Length == 0 || pattern.Length != wildcards.Length)
                throw new ArgumentException("Invalid signature arrays.");

            var anchor = -1;
            for (var index = 0; index < wildcards.Length; index++)
            {
                if (!wildcards[index])
                {
                    anchor = index;
                    break;
                }
            }
            if (anchor < 0)
                throw new ArgumentException("A signature must contain at least one concrete byte.");

            var matches = new List<int>();
            var last = data.Length - pattern.Length;
            for (var offset = 0; offset <= last; offset++)
            {
                if (data[offset + anchor] != pattern[anchor])
                    continue;

                var matched = true;
                for (var index = 0; index < pattern.Length; index++)
                {
                    if (!wildcards[index] && data[offset + index] != pattern[index])
                    {
                        matched = false;
                        break;
                    }
                }
                if (!matched)
                    continue;

                matches.Add(offset);
                if (matches.Count >= maximumMatches)
                    break;
            }
            return matches.ToArray();
        }
    }
}
"@
}

$files = Resolve-GameFiles $GamePath
$template = Get-Item -LiteralPath (Resolve-Path -LiteralPath $TemplatePath).Path
$gameVersion = [IO.File]::ReadAllText($files.VersionFile.FullName).Trim()
if ([string]::IsNullOrWhiteSpace($gameVersion)) {
  throw "ffxivgame.ver is empty."
}
if (-not [string]::IsNullOrWhiteSpace($ExpectedVersion) -and $gameVersion -ne $ExpectedVersion) {
  throw "Game version mismatch. Expected $ExpectedVersion but found $gameVersion."
}

$manifest = [IO.File]::ReadAllText($template.FullName) | ConvertFrom-Json
if ($manifest.schemaVersion -ne 2) {
  throw "The manifest template schema is not supported."
}
if (-not [IO.Path]::GetFileName($files.Executable.FullName).Equals(
    [string]$manifest.module.name,
    [StringComparison]::OrdinalIgnoreCase)) {
  throw "The executable name does not match module.name in the template."
}

$image = Get-PeImage $files.Executable
$textHash = Get-Sha256 $image.Text.Bytes
$executableHash = (Get-FileHash -LiteralPath $files.Executable.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
$functionVerification = [ordered]@{}

foreach ($property in $manifest.functions.PSObject.Properties) {
  $name = $property.Name
  $spec = $property.Value
  $signature = Convert-Signature ([string]$spec.pattern)
  $signatureMatches = @([GameBridge.ManifestScanner]::Find(
    $image.Text.ScanBytes,
    $signature.Bytes,
    $signature.Wildcards,
    2))
  if ($signatureMatches.Count -eq 0) {
    throw "Signature '$name' did not match the executable .text section."
  }
  if ($signatureMatches.Count -ne 1) {
    throw "Signature '$name' matched the executable .text section more than once."
  }

  $matchOffset = [long]$signatureMatches[0]
  $matchRva = [long]$image.Text.VirtualAddress + $matchOffset
  $resolveKind = [string]$spec.resolve
  $resolveOffset = if ($null -ne $spec.PSObject.Properties['offset']) { [long]$spec.offset } else { 0 }
  $nextInstruction = if ($null -ne $spec.PSObject.Properties['nextInstruction']) {
    [long]$spec.nextInstruction
  }
  else {
    0
  }

  switch ($resolveKind) {
    "direct" {
      $resolvedRva = $matchRva + $resolveOffset
    }
    "relative32" {
      $displacement = Read-Int32 $image.Text.ScanBytes ($matchOffset + $resolveOffset) "relative32 displacement"
      $resolvedRva = $matchRva + $nextInstruction + $displacement
    }
    "rip_relative" {
      $displacement = Read-Int32 $image.Text.ScanBytes ($matchOffset + $resolveOffset) "RIP-relative displacement"
      $resolvedRva = $matchRva + $nextInstruction + $displacement
    }
    default {
      throw "Signature '$name' uses an unsupported resolve kind: $resolveKind"
    }
  }
  if ($resolvedRva -lt 0 -or $resolvedRva -ge $image.ImageSize) {
    throw "Signature '$name' resolved outside the executable image."
  }

  $functionVerification[$name] = [ordered]@{
    matchRva = ('0x{0:X}' -f $matchRva)
    resolvedRva = ('0x{0:X}' -f $resolvedRva)
  }
  Write-Host ("Verified {0}: match={1}, resolved={2}" -f
    $name,
    $functionVerification[$name].matchRva,
    $functionVerification[$name].resolvedRva)
}

$manifest.gameVersion = $gameVersion
$manifest.module.textSha256 = $textHash
$manifest | Add-Member -MemberType NoteProperty -Name source -Value ([pscustomobject][ordered]@{
  generatedBy = "collect-manifest.ps1"
  generatedAtUtc = [DateTime]::UtcNow.ToString("O")
  executableSha256 = $executableHash
  textRva = ('0x{0:X}' -f $image.Text.VirtualAddress)
  textRawSize = ('0x{0:X}' -f $image.Text.RawSize)
  textVirtualSize = ('0x{0:X}' -f $image.Text.VirtualSize)
}) -Force
$manifest | Add-Member -MemberType NoteProperty -Name verification -Value ([pscustomobject][ordered]@{
  signaturePolicy = "exactly_one_match"
  addressKind = "module_rva"
  functions = [pscustomobject]$functionVerification
}) -Force

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $PSScriptRoot "config\manifests\$gameVersion.json"
}
$outputFullPath = [IO.Path]::GetFullPath($OutputPath)
if ((Test-Path -LiteralPath $outputFullPath) -and -not $Force) {
  throw "The output manifest already exists. Use -Force to overwrite it."
}
$outputDirectory = [IO.Path]::GetDirectoryName($outputFullPath)
if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
  throw "The output manifest path has no parent directory."
}
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$json = $manifest | ConvertTo-Json -Depth 32
$utf8WithoutBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($outputFullPath, $json + [Environment]::NewLine, $utf8WithoutBom)

Write-Host "Manifest generated successfully."
Write-Host "Game version: $gameVersion"
Write-Host "Raw .text SHA-256: $textHash"
Write-Host "Output: $outputFullPath"
if ($null -eq $manifest.PSObject.Properties['privateLayoutVerified'] -or
    -not [bool]$manifest.privateLayoutVerified) {
  Write-Warning "Region switching remains disabled until privateLayoutVerified is confirmed manually."
}
