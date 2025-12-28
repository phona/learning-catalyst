# Test Determinism Validation Script (PowerShell)
# Runs the renderer test suite 3 times and verifies identical results

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Test Determinism Validation" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Run tests 3 times
$results = @()
for ($i = 1; $i -le 3; $i++) {
  Write-Host "=== Run $i ===" -ForegroundColor Yellow
  $outputFile = "results-$i.txt"

  # Run tests and capture output
  npm run test:renderer 2>&1 | Tee-Object -FilePath $outputFile | Out-Null

  # Extract summary for display
  $summary = Select-String -Path $outputFile -Pattern "Test Files.*Tests.*Duration" | Select-Object -First 1
  if ($summary) {
    Write-Host $summary.Line
  }

  $results += Get-Content $outputFile -Raw
  Write-Host "Completed run $i"
  Write-Host ""
}

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Comparing Results..." -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Compare results
if ($results[0] -eq $results[1] -and $results[1] -eq $results[2]) {
  Write-Host "✅ All 3 runs produced identical results - Tests are DETERMINISTIC" -ForegroundColor Green
  exit 0
} else {
  Write-Host "❌ Results differ between runs - Tests are NOT deterministic" -ForegroundColor Red

  # Show differences
  Write-Host ""
  Write-Host "Differences between Run 1 and Run 2:" -ForegroundColor Yellow

  $diff1 = Compare-Object ($results[0] -split "`n") ($results[1] -split "`n")
  if ($diff1) {
    $diff1 | ForEach-Object { Write-Host $_.InputObject }
  }

  Write-Host ""
  Write-Host "Differences between Run 2 and Run 3:" -ForegroundColor Yellow
  $diff2 = Compare-Object ($results[1] -split "`n") ($results[2] -split "`n")
  if ($diff2) {
    $diff2 | ForEach-Object { Write-Host $_.InputObject }
  }

  exit 1
}
