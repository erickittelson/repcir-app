#!/bin/bash
# Workaround for Cursor MCP path bug
# Cursor tries to write to /Users/mcp.json instead of ~/.cursor/mcp.json

echo "🔍 Checking Cursor MCP configuration..."

MCP_CONFIG="$HOME/.cursor/mcp.json"
WRONG_PATH="/Users/mcp.json"

if [ ! -f "$MCP_CONFIG" ]; then
    echo "❌ MCP config not found at $MCP_CONFIG"
    exit 1
fi

echo "✅ MCP config exists at: $MCP_CONFIG"
echo ""

# Check if wrong path exists (shouldn't)
if [ -f "$WRONG_PATH" ]; then
    echo "⚠️  Found file at wrong location: $WRONG_PATH"
    echo "   This shouldn't exist. Checking permissions..."
    ls -la "$WRONG_PATH"
    echo ""
    read -p "Remove it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm -f "$WRONG_PATH"
        echo "✅ Removed $WRONG_PATH"
    fi
else
    echo "✅ No file at wrong location ($WRONG_PATH)"
fi

echo ""
echo "📋 Current MCP config:"
cat "$MCP_CONFIG" | jq '.' 2>/dev/null || cat "$MCP_CONFIG"

echo ""
echo "💡 Workaround options:"
echo "1. This is a Cursor bug - report it to Cursor support"
echo "2. Try updating Cursor to the latest version"
echo "3. The Neon MCP server itself is working correctly"
echo "4. You can use neonctl CLI as an alternative:"
echo "   npx neonctl@latest projects list"
echo "   npx neonctl@latest sql 'SELECT * FROM circles LIMIT 5'"
