# threadlist-history-visible Specification

## Purpose
TBD - created by archiving change fix-threadlist-history-stuck-loading. Update Purpose after archive.
## Requirements
### Requirement: Sidebar Renders Archived Threads Under History
If there are archived threads (e.g. sessions mapped to `status: "archived"`), the sidebar MUST provide a visible "History" section that renders those threads.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Only Archived Sessions Exist After Refresh
- **Given** `threads.isLoading` is false
- **And** `threads.threadIds` is empty
- **And** `threads.archivedThreadIds` contains at least one thread id
- **When** the ThreadList sidebar renders
- **Then** the sidebar shows at least one thread list item under "History"
- **And** the user can click a history item to switch to that thread

---

### Requirement: Loading State Does Not Hide History
When loading completes, the sidebar MUST stop showing the loading skeleton and MUST render any available threads (regular and/or history).

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Loading Completes With History Available
- **Given** `threads.isLoading` transitions from true to false
- **And** `threads.archivedThreadIds` contains at least one thread id
- **When** the ThreadList sidebar re-renders
- **Then** the loading skeleton is not displayed
- **And** history thread items are displayed

