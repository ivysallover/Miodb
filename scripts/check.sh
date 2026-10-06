#!/usr/bin/env bash
# Verificación completa con salida mínima: una línea por paso si pasa,
# y solo las líneas de error si falla. Pensado para gastar pocos tokens.
cd "$(dirname "$0")/.." || exit 1
fail=0

out=$(npx tsc --noEmit 2>&1); n=$(printf '%s\n' "$out" | grep -c 'error TS')
if [ "$n" -eq 0 ]; then echo "tsc    OK"; else echo "tsc    FALLA ($n errores)"; printf '%s\n' "$out" | grep 'error TS' | head -20; fail=1; fi

out=$(npx vitest run 2>&1)
if [ $? -eq 0 ]; then echo "tests  OK ($(printf '%s\n' "$out" | grep -E '^ +Tests' | sed 's/^ *Tests *//'))"; else echo "tests  FALLA"; printf '%s\n' "$out" | grep -E 'FAIL|Error|✗|×|expected' | head -30; fail=1; fi

out=$(npx vite build 2>&1)
if [ $? -eq 0 ]; then echo "build  OK"; else echo "build  FALLA"; printf '%s\n' "$out" | grep -iE 'error|failed' -A4 | head -30; fail=1; fi

exit $fail
