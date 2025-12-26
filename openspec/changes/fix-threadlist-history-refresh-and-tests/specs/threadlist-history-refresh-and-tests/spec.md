# threadlist-history-refresh-and-tests Specification

## Purpose
Prevent “history looks stuck loading / empty after refresh” and ensure tests cover the real runtime wiring.

## ADDED Requirements

### Requirement: Refresh renders History when archived exists
If there are archived threads, the sidebar MUST render them under a visible “History” section after loading completes.

**Priority**: P0

#### Scenario: Only history exists
- **Given** `threads.isLoading` is false
- **And** `threads.threadIds` is empty
- **And** `threads.archivedThreadIds` contains at least one id
- **When** the sidebar renders
- **Then** a “History” header is visible
- **And** at least one history item is visible

---

### Requirement: Switching to a history thread must not hang
Switching to an archived/history thread MUST NOT block indefinitely due to an `unarchive()` IPC call.

**Priority**: P0

#### Scenario: Unarchive IPC stalls
- **Given** a history thread exists
- **And** the underlying session status update never resolves (stalls)
- **When** the user switches to that history thread (direct link or click)
- **Then** the UI remains usable (no infinite loading lock)

---

### Requirement: Tests cover real wiring
We MUST have at least one integration test that exercises:
```
ReadyApp -> remote thread list runtime -> adapter -> ThreadListSidebar
```

**Priority**: P1

#### Scenario: Runtime integration test exists
- **Given** the renderer test suite is run
- **When** tests execute
- **Then** at least one integration test mounts the real runtime wiring and asserts History renders
