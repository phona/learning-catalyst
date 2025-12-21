# 1. Define the Architectural Rules
$TS_ARCHITECT_PROMPT = @"
You are a Senior TypeScript Architect. Repair errors in the provided file.
- NEVER use 'any'. Use 'unknown' or proper interfaces.
- Use Discriminated Unions for state/responses.
- Use Type Guards instead of type casting (as).
- Do not just add '?' to properties; fix the root initialization or null-check.
"@

Write-Host "🚀 Starting concurrent repair (Native String Mode)...`n" -ForegroundColor Cyan

# 2. Process files
Get-Content .\typechecks-errors.txt | ForEach-Object -Parallel {
    $filePath = $_
    $startTime = Get-Date

    try {
        # Pass environment variables as a list of strings instead of a hashtable
        cross-env ELECTRON_GET_USE_PROXY=true `
                  GLOBAL_AGENT_HTTPS_PROXY=http://127.0.0.1:7890 `
                  HTTP_PROXY=http://127.0.0.1:7890 `
                  HTTPS_PROXY=http://127.0.0.1:7890 `
                  NO_PROXY=open.bigmodel.cn `
                  claude --system-prompt "$TS_ARCHITECT_PROMPT" `
                         -p "Fix all TypeScript errors in: $filePath" `
                         --allowedTools "Bash,Read,Edit" 2>&1

        $duration = New-TimeSpan -Start $startTime -End (Get-Date)
        Write-Host "[OK] ($($duration.Seconds)s) $filePath" -ForegroundColor Green
    }
    catch {
        Write-Host "[FAIL] $filePath - $($_.Exception.Message)" -ForegroundColor Red
    }
} -ThrottleLimit 20