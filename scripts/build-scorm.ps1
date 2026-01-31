<#
.SYNOPSIS
Builds a SCORM ZIP from a single HTML file.

.DESCRIPTION
Creates a staging folder with:
- the HTML at ZIP root (with ../assets/ rewritten to assets/)
- a generated imsmanifest.xml from scripts/imsmanifest.template.xml
- the shared assets/ folder from the repo root
- any locally-referenced files found in the HTML (src, href, srcset)

.PARAMETER HtmlPath
Path to the source HTML file.

.PARAMETER OutputPath
Optional path for the resulting ZIP. Defaults to scorm_<htmlbase>.zip at repo root.

.PARAMETER Title
Optional title for imsmanifest.xml. Defaults to <title> from HTML or the file base name.

.EXAMPLE
.\scripts\build-scorm.ps1 -HtmlPath .\medien\Fake-News-Bilder.html
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$HtmlPath,

    [string]$OutputPath,
    [string]$Title
)

function Normalize-RelativePath {
    param([string]$Path)
    $parts = $Path -replace "\\", "/" -split "/"
    $stack = New-Object System.Collections.Generic.List[string]
    foreach ($part in $parts) {
        if ($part -eq "" -or $part -eq ".") {
            continue
        }
        if ($part -eq "..") {
            if ($stack.Count -gt 0) {
                $stack.RemoveAt($stack.Count - 1)
            }
            continue
        }
        $stack.Add($part)
    }
    return ($stack -join "/")
}

function Get-LocalRefsFromHtml {
    param([string]$Html)
    $refs = New-Object System.Collections.Generic.HashSet[string]

    $attrMatches = [regex]::Matches($Html, '(?i)(?:src|href)\s*=\s*["'']([^"'']+)["'']')
    foreach ($m in $attrMatches) {
        $value = $m.Groups[1].Value
        if ($value) { [void]$refs.Add($value) }
    }

    $srcsetMatches = [regex]::Matches($Html, '(?i)srcset\s*=\s*["'']([^"'']+)["'']')
    foreach ($m in $srcsetMatches) {
        $value = $m.Groups[1].Value
        if (-not $value) { continue }
        foreach ($entry in ($value -split ",")) {
            $item = $entry.Trim().Split(" ")[0]
            if ($item) { [void]$refs.Add($item) }
        }
    }

    return $refs
}

$root = Get-Location
$resolvedHtml = Resolve-Path -LiteralPath $HtmlPath -ErrorAction Stop
$htmlFile = $resolvedHtml.Path
$htmlDir = Split-Path -Parent $htmlFile
$htmlName = Split-Path -Leaf $htmlFile
$htmlBase = [System.IO.Path]::GetFileNameWithoutExtension($htmlFile)

$templatePath = Join-Path $PSScriptRoot "imsmanifest.template.xml"
if (-not (Test-Path $templatePath)) {
    Write-Error "Missing template: $templatePath"
    exit 1
}

$htmlText = Get-Content -LiteralPath $htmlFile -Raw -Encoding UTF8
if (-not $Title) {
    $titleMatch = [regex]::Match($htmlText, '(?is)<title>\s*(.*?)\s*</title>')
    if ($titleMatch.Success) {
        $Title = $titleMatch.Groups[1].Value
    } else {
        $Title = $htmlBase
    }
}

if (-not $OutputPath) {
    $OutputPath = Join-Path $root ("scorm_{0}.zip" -f $htmlBase)
}

$staging = Join-Path $env:TEMP ("scorm_build_{0}" -f ([Guid]::NewGuid().ToString("N")))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    $adjustedHtml = $htmlText -replace '(\.\./)+assets/', 'assets/' -replace '(\.\.\\)+assets\\', 'assets\\'
    Set-Content -LiteralPath (Join-Path $staging $htmlName) -Value $adjustedHtml -Encoding UTF8

    $assetsPath = Join-Path $root "assets"
    if (Test-Path $assetsPath) {
        Copy-Item -Path $assetsPath -Destination (Join-Path $staging "assets") -Recurse -Force
    } else {
        Write-Warning "assets folder not found at $assetsPath"
    }

    $refs = Get-LocalRefsFromHtml -Html $htmlText
    foreach ($ref in $refs) {
        $clean = $ref.Split("#")[0].Split("?")[0].Trim()
        if (-not $clean) { continue }

        $lower = $clean.ToLowerInvariant()
        if ($lower.StartsWith("http://") -or
            $lower.StartsWith("https://") -or
            $lower.StartsWith("data:") -or
            $lower.StartsWith("mailto:") -or
            $lower.StartsWith("javascript:")) {
            continue
        }

        $clean = $clean.TrimStart("/")
        $sourcePath = Join-Path $htmlDir $clean
        $resolved = Resolve-Path -LiteralPath $sourcePath -ErrorAction SilentlyContinue
        if (-not $resolved) {
            Write-Warning ("Missing referenced file: {0}" -f $clean)
            continue
        }

        $normalized = Normalize-RelativePath -Path $clean
        if (-not $normalized) { continue }

        $destPath = Join-Path $staging $normalized
        $destDir = Split-Path -Parent $destPath
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        Copy-Item -LiteralPath $resolved.Path -Destination $destPath -Force
    }

    $manifestTemplate = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
    $safeTitle = [System.Security.SecurityElement]::Escape($Title)
    $safeLaunch = [System.Security.SecurityElement]::Escape($htmlName)
    $manifest = $manifestTemplate -replace "\{\{TITLE\}\}", $safeTitle
    $manifest = $manifest -replace "\{\{LAUNCH\}\}", $safeLaunch

    Set-Content -LiteralPath (Join-Path $staging "imsmanifest.xml") -Value $manifest -Encoding UTF8

    if (Test-Path $OutputPath) {
        Remove-Item $OutputPath -Force
    }

    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $OutputPath -Force
    Write-Host ("Created {0}" -f $OutputPath)
} finally {
    if (Test-Path $staging) {
        Remove-Item $staging -Recurse -Force
    }
}
