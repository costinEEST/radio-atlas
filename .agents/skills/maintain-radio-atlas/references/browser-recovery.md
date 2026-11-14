# Recover Chrome MCP

## Recover a blocked Chrome MCP

Prefer Chrome MCP for browsing, page inspection, playback checks, UI validation, and Lighthouse whenever its tools support the task. A profile-in-use error is a recoverable blocker; attempt this procedure before switching to CLI browser automation.

1. Try `list_pages` first. If it succeeds, reuse that MCP browser with `new_page` or `navigate_page` rather than starting another instance.
2. If MCP cannot list or open pages, inspect the relevant processes with `ps aux | rg 'chrome-devtools-mcp|chrome-profile'`. If the sandbox rejects `ps`, request escalation for this exact read-only inspection; a narrow `ps aux` prefix is appropriate.
3. Compare start times and command lines to distinguish the current MCP from an older orphan. Identify the stale `npm exec chrome-devtools-mcp...` process, its MCP child, and the dedicated browser main process containing `--user-data-dir=.../.cache/chrome-devtools-mcp/chrome-profile`. The configured browser may be Chrome or Edge. Never target the user's ordinary browser or all browser, Node, or npm processes.
4. Request approval to send normal termination signals to those explicit stale PIDs, for example `kill <stale-npm-pid> <stale-mcp-pid> <stale-browser-pid>`, then retry MCP. Do not use broad `pkill`, wildcards, command substitution, or `kill -9` as the first attempt. Do not hard-code PIDs from an earlier session.
5. Only after process inspection confirms that no browser uses the MCP profile, inspect its `SingletonLock`, `SingletonSocket`, and `SingletonCookie`. If stale singleton files alone remain, request approval to remove those exact files, then retry. Never delete the entire MCP cache or profile.
6. Stop recovery as soon as `list_pages` or `new_page` succeeds. Report whether process termination or singleton cleanup was required, then resume the task using MCP.

If recovery fails, report the exact blocker before using a fallback. A login, security, or access-control page does not verify the intended page. Distinguish direct browser observations from indexed excerpts or CLI checks, and never present a successful HTTP response as confirmed audio playback.
