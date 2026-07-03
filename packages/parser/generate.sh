#!/usr/bin/env bash
set -euo pipefail

GRAMMAR="src/grammar/SYSDML.g4"
OUT="generated"

echo "Generating ANTLR4 TypeScript parser from $GRAMMAR..."
rm -rf "$OUT"
pnpm exec antlr-ng \
  -D language=TypeScript \
  -l false \
  -o "$OUT" \
  "$GRAMMAR"

echo "Done. Generated files in $OUT/"
