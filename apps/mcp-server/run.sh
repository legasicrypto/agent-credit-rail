#!/bin/bash
cd /Users/arnaudbiju-duval/code/legasi/agent-credit-rail
export PATH="/opt/homebrew/bin:$PATH"
exec ./apps/mcp-server/node_modules/.bin/tsx apps/mcp-server/src/main.ts
