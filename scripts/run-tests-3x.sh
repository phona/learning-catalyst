#!/bin/bash
# Test Determinism Validation Script
# Runs the renderer test suite 3 times and verifies identical results

set -e

echo "==================================="
echo "Test Determinism Validation"
echo "==================================="
echo ""

# Run tests 3 times
for i in 1 2 3; do
  echo "=== Run $i ==="
  npm run test:renderer > "results-$i.txt" 2>&1
  echo "Completed run $i"
  echo ""

  # Extract summary line
  grep -E "Test Files.*Tests.*Duration" "results-$i.txt" || true
done

echo ""
echo "==================================="
echo "Comparing Results..."
echo "==================================="

# Compare results
if diff results-1.txt results-2.txt > /dev/null && diff results-2.txt results-3.txt > /dev/null; then
  echo "✅ All 3 runs produced identical results - Tests are DETERMINISTIC"
  exit 0
else
  echo "❌ Results differ between runs - Tests are NOT deterministic"
  echo ""
  echo "Differences between Run 1 and Run 2:"
  diff results-1.txt results-2.txt || true
  echo ""
  echo "Differences between Run 2 and Run 3:"
  diff results-2.txt results-3.txt || true
  exit 1
fi
