param(
  [string]$Root = (Join-Path $PSScriptRoot "..")
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$scriptPattern = [regex]::new(
  '<script\b(?<attrs>[^>]*)>(?<body>.*?)</script>',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$configClassPattern = [regex]::new(
  'class\s*=\s*["''][^"'']*\bwb-config\b[^"'']*["'']',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$issues = @()
$parseErrors = @()
$fileCount = 0
$configCount = 0
$questionCount = 0

Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Filter '*.html' | ForEach-Object {
  $fileCount++
  $file = $_
  $relativePath = $file.FullName.Substring($resolvedRoot.Length + 1)
  $html = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8

  foreach ($script in $scriptPattern.Matches($html)) {
    if (-not $configClassPattern.IsMatch($script.Groups['attrs'].Value)) {
      continue
    }

    $line = ($html.Substring(0, $script.Index) -split "`n").Count
    try {
      $config = $script.Groups['body'].Value | ConvertFrom-Json -ErrorAction Stop
      $configCount++
    }
    catch {
      $parseErrors += [pscustomobject]@{
        File = $relativePath
        Line = $line
        Error = $_.Exception.Message
      }
      continue
    }

    if (-not $config.questions) {
      continue
    }

    for ($index = 0; $index -lt $config.questions.Count; $index++) {
      $questionCount++
      $question = $config.questions[$index]
      $correctAnswers = @($question.correct)
      $hasMultiple = (
        $question.PSObject.Properties.Name -contains 'multiple' -and
        $question.multiple -eq $true
      )

      if ($correctAnswers.Count -gt 1 -and -not $hasMultiple) {
        $issues += [pscustomobject]@{
          File = $relativePath
          Line = $line
          Config = $config.id
          Question = $index + 1
          Correct = $correctAnswers -join ','
        }
      }
    }
  }
}

Write-Output "HTML-Dateien: $fileCount | wb-config-Blöcke: $configCount | Fragen: $questionCount"

if ($parseErrors.Count -gt 0) {
  Write-Output "`nUngültige wb-config-JSON-Blöcke:"
  $parseErrors | Sort-Object File, Line | Format-Table -AutoSize
}

if ($issues.Count -gt 0) {
  Write-Output "`nMehrere Lösungen, aber keine Mehrfachauswahl:"
  $issues | Sort-Object File, Line, Question | Format-Table -AutoSize
}

Write-Output "JSON_ERRORS=$($parseErrors.Count) MULTIPLE_ISSUES=$($issues.Count)"
if ($parseErrors.Count -gt 0 -or $issues.Count -gt 0) {
  exit 1
}
