#!/bin/bash

# Technical Debt Detection Script
# Usage: ./scripts/detect-technical-debt.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo "TECHNICAL DEBT DETECTION"
echo "============================================================"

# 1. Unused Dependencies
echo -e "\n${CYAN}📦 Checking unused dependencies...${NC}"
npx depcheck --json 2>/dev/null | head -50 || echo "depcheck not available"

# 2. Unused Exports
echo -e "\n${CYAN}🔍 Checking unused exports...${NC}"
npx ts-prune --skip src/test --skip src/devtools 2>/dev/null | head -30 || echo "ts-prune not available"

# 3. Circular Dependencies
echo -e "\n${CYAN}🔁 Checking circular dependencies...${NC}"
npx madge --circular --extensions ts,tsx src/ 2>/dev/null || echo "madge not available"

# 4. Console.log statements
echo -e "\n${CYAN}🔧 Finding console.log statements...${NC}"
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs -I{} echo "  Found {} console.log statements"

# 5. TODO/FIXME comments
echo -e "\n${CYAN}📝 Finding TODO/FIXME comments...${NC}"
echo -n "  TODOs: "
grep -r "TODO" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo -n "  FIXMEs: "
grep -r "FIXME" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l

# 6. 'any' type usage
echo -e "\n${CYAN}🎯 Finding 'any' type usage...${NC}"
grep -rE ": any[^a-zA-Z]|<any>" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs -I{} echo "  Found {} 'any' usages"

# 7. Type check
echo -e "\n${CYAN}✅ Running type check...${NC}"
if npm run type-check 2>&1 | tail -5; then
    echo -e "${GREEN}  Type check passed${NC}"
else
    echo -e "${RED}  Type check failed${NC}"
fi

# 8. Tests
echo -e "\n${CYAN}🧪 Running tests...${NC}"
if npm test -- --run 2>&1 | tail -10; then
    echo -e "${GREEN}  Tests passed${NC}"
else
    echo -e "${RED}  Tests failed${NC}"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}✅ Technical debt detection complete${NC}"
echo "============================================================"
