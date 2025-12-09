#!/bin/bash

# Categorize and summarize TypeScript errors in main process

echo "=== TYPESCRIPT TYPE ERRORS IN MAIN PROCESS ==="
echo ""
echo "Total errors: $(cat type-check-output.txt | grep -E 'src/main/' | wc -l)"
echo ""

# Group by file
echo "=== ERRORS BY FILE ==="
cat type-check-output.txt | grep -E 'src/main/' | cut -d':' -f1 | sort | uniq -c | sort -rn | head -20
echo ""

# Group by error type
echo "=== ERRORS BY TYPE ==="
cat type-check-output.txt | grep -E 'src/main/' | \
  sed -E 's/.*error TS[0-9]+: //' | \
  cut -d'.' -f1 | sort | uniq -c | sort -rn | head -15
echo ""

# Show critical errors (non-test files)
echo "=== CRITICAL ERRORS (NON-TEST FILES) ==="
cat type-check-output.txt | grep -E 'src/main/' | \
  grep -v '__tests__' | \
  grep -v 'test.ts' | \
  head -30

echo ""
echo "=== TEST FILE ERRORS ==="
cat type-check-output.txt | grep -E 'src/main/' | \
  grep '__tests__' | \
  head -20
