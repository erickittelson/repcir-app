#!/bin/bash
# Sync mcp.json to Cursor worktrees
# Run this if Cursor complains about mcp.json path issues

MCP_SOURCE="$HOME/.cursor/mcp.json"
WORKTREE_BASE="$HOME/.cursor/worktrees/family-workout-app"

if [ ! -f "$MCP_SOURCE" ]; then
    echo "❌ Source mcp.json not found at $MCP_SOURCE"
    exit 1
fi

echo "🔄 Syncing mcp.json to worktrees..."

for worktree in "$WORKTREE_BASE"/*/; do
    if [ -d "$worktree/.cursor" ]; then
        cp "$MCP_SOURCE" "$worktree/.cursor/mcp.json"
        echo "✅ Synced to $(basename "$worktree")"
    fi
done

echo "✅ Sync complete"
