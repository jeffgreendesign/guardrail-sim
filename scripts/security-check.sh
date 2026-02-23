#!/bin/bash
# ============================================================================
# Security Check — Source-Level Security Scanner
# ============================================================================
# Scans source files for common security issues. Non-blocking by default
# (exits 0 with warnings). Use --strict to fail on any finding.
#
# What it catches:
#   - Path traversal: user input flowing into filesystem operations
#   - Hardcoded secrets: API keys, tokens, passwords in source
#   - eval() usage: code injection risk
#   - SQL string interpolation: SQL injection risk
#   - console.log in non-test files (warn only)
#
# Usage:
#   ./scripts/security-check.sh              # Warn only (exit 0)
#   ./scripts/security-check.sh --strict     # Fail on findings (exit 1)
# ============================================================================
set -euo pipefail

STRICT=false
if [ "${1:-}" = "--strict" ]; then
  STRICT=true
fi

WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  NC='\033[0m'
else
  RED=''
  YELLOW=''
  GREEN=''
  NC=''
fi

warn() {
  echo -e "${YELLOW}WARNING:${NC} $1"
  echo "  File: $2"
  echo "  Line: $3"
  echo ""
  WARNINGS=$((WARNINGS + 1))
}

# Scan a set of files with a grep pattern and report matches
# Usage: scan_pattern "description" "grep_pattern" file1 file2 ...
scan_pattern() {
  local description="$1"
  local pattern="$2"
  shift 2
  local grep_flags="-nE"
  if [ "$description" = "Possible hardcoded secret" ]; then
    grep_flags="-niE"
  fi

  for file in "$@"; do
    [ -f "$file" ] || continue
    grep $grep_flags "$pattern" "$file" 2>/dev/null | while IFS=: read -r line_num matched_line; do
      # Skip comment lines
      local trimmed
      trimmed=$(echo "$matched_line" | sed 's/^[[:space:]]*//')
      case "$trimmed" in
        "//"*|"#"*|"*"*) continue ;; # skip comments
      esac
      warn "$description" "$file" "$line_num"
    done || true
  done
}

# Get files to check: staged files if in git context, else all source files
STAGED_FILES=()
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  mapfile -t STAGED_FILES < <(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
fi

if [ "${#STAGED_FILES[@]}" -eq 0 ]; then
  # No staged files — check all source files across packages
  mapfile -t ALL_FILES < <(find "$PROJECT_DIR/packages" -path '*/src/*' -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) ! -path '*/node_modules/*' ! -path '*/dist/*' 2>/dev/null || true)
else
  ALL_FILES=("${STAGED_FILES[@]}")
fi

if [ "${#ALL_FILES[@]}" -eq 0 ]; then
  echo -e "${GREEN}No files to check.${NC}"
  exit 0
fi

# Separate test files from source files
SOURCE_FILES=()
TEST_FILES=()
for file in "${ALL_FILES[@]}"; do
  case "$file" in
    *.test.* | *.spec.* | *__tests__* | *test_*) TEST_FILES+=("$file") ;;
    *) SOURCE_FILES+=("$file") ;;
  esac
done

echo "Security scan: checking ${#ALL_FILES[@]} files..."
echo ""

# --- Path Traversal ---
# User input flowing into filesystem operations without sanitization
scan_pattern "Possible path traversal — user input in filesystem operation" \
  '(readFile|writeFile|readdir|mkdir|unlink|path\.join|path\.resolve)\s*\(.*\b(req\.|request\.|params\.|query\.|body\.|input)' \
  "${ALL_FILES[@]}"

# --- Console.log in non-test files ---
if [ "${#SOURCE_FILES[@]}" -gt 0 ]; then
  scan_pattern "console.log() in non-test file (use structured logger)" \
    'console\.(log|debug)\(' \
    "${SOURCE_FILES[@]}"
fi

# --- Hardcoded Secrets ---
# API keys, tokens, passwords assigned as string literals (skip .example/.template)
SCANNABLE_FILES=()
for file in "${ALL_FILES[@]}"; do
  case "$file" in
    *.example | *.template) ;; # skip
    *) SCANNABLE_FILES+=("$file") ;;
  esac
done
if [ "${#SCANNABLE_FILES[@]}" -gt 0 ]; then
  scan_pattern "Possible hardcoded secret" \
    "(api_key|apikey|secret|password|token|private_key)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{8,}" \
    "${SCANNABLE_FILES[@]}"
fi

# --- eval() Usage ---
scan_pattern "eval() usage — code injection risk" \
  '\beval\s*\(' \
  "${ALL_FILES[@]}"

# --- SQL String Interpolation ---
scan_pattern "SQL string interpolation — use parameterized queries" \
  '(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*(\$\{|" *\+)' \
  "${ALL_FILES[@]}"

# Summary
echo "──────────────────────────────────────"
if [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}No security issues found.${NC}"
  exit 0
fi

echo -e "${YELLOW}Found $WARNINGS warning(s).${NC}"

if [ "$STRICT" = true ]; then
  echo -e "${RED}Strict mode: failing due to warnings.${NC}"
  exit 1
fi

echo "Run with --strict to treat warnings as errors."
exit 0
