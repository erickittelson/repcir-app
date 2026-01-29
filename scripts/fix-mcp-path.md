# Fix for Cursor MCP Path Issue

## Problem
Cursor is trying to write to `/Users/mcp.json` instead of `~/.cursor/mcp.json`, causing permission errors.

## Root Cause
Cursor's worktree system is resolving the MCP config path incorrectly, attempting to write to `/Users/` which requires root permissions.

## Solution Options

### Option 1: Verify Cursor Settings
1. Open Cursor Settings (Cmd+,)
2. Search for "MCP" or "Model Context Protocol"
3. Verify the config path is set to `~/.cursor/mcp.json` or `/Users/erickittelson/.cursor/mcp.json`
4. If there's a path setting, ensure it's correct

### Option 2: Restart Cursor
Sometimes Cursor caches paths incorrectly. A full restart may fix it:
1. Quit Cursor completely (Cmd+Q)
2. Reopen Cursor
3. The error should resolve

### Option 3: Check Cursor Version
This might be a bug in your Cursor version:
1. Check Cursor → About Cursor
2. Update to the latest version if available
3. Report the bug to Cursor support if it persists

### Option 4: Manual Workaround (if needed)
If the above don't work, you can try creating a symlink (requires admin):
```bash
sudo ln -s /Users/erickittelson/.cursor/mcp.json /Users/mcp.json
```
**Warning**: This requires sudo/admin access and may not be recommended.

## Current Status
- ✅ MCP config exists at correct location: `~/.cursor/mcp.json`
- ✅ Config is valid and readable
- ✅ API key is valid
- ✅ Neon MCP server is reachable
- ❌ Cursor is trying to write to wrong path: `/Users/mcp.json`

## Verification
After applying a fix, verify by:
1. Checking Cursor doesn't show the error
2. Verifying MCP tools are accessible (if Cursor exposes them)
