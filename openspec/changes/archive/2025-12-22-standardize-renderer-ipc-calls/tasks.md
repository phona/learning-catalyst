# Task Checklist: Standardize Renderer IPC Calls

## Priority 1: Critical Services (Fix Runtime Bugs)

### Task 1.1: File Service
- [x] Update `src/renderer/services/file/file-service.ts`
- [x] Import `unwrapAPI` from `@/renderer/hooks/useElectronAPI`
- [x] Replace manual unwrapping in `readDirectory` method - NOT NEEDED: File APIs return raw data
- [x] Replace manual unwrapping in `readFile` method - NOT NEEDED: File APIs return raw data
- [x] Replace manual unwrapping in `writeFile` method - NOT NEEDED: File APIs return raw data
- [x] Replace manual unwrapping in `existsFile` method - NOT NEEDED: File APIs return raw data
- [x] Replace manual unwrapping in `getWorkspacePath` method - NOT NEEDED: File APIs return raw data
- [x] Test file operations work correctly
- [x] Verify error toasts display on failures

### Task 1.2: Chat Service
- [x] Update `src/renderer/services/chat/chat-service.ts`
- [x] Import `unwrapAPI` from `@/renderer/hooks/useElectronAPI`
- [x] Replace manual unwrapping in `sendMessage` method
- [x] Replace manual unwrapping in `getMessages` method
- [x] Replace manual unwrapping in `generateTitle` method
- [x] Test chat functionality works correctly
- [x] Verify error handling is consistent

## Priority 2: High-Usage Services

### Task 2.1: Session Service
- [x] Update `src/renderer/services/sessions/session-service.ts`
- [x] Replace all manual unwrapping with `unwrapAPI` (except APIs returning raw data)
- [x] Test session operations

### Task 2.2: Settings Service
- [x] Update `src/renderer/services/configuration/configuration-service.ts`
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test settings operations

### Task 2.3: Analytics Service
- [x] Update `src/renderer/services/analytics/analytics-service.ts`
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test analytics operations

## Priority 3: Catalyst & Knowledge Services

### Task 3.1: Catalyst Service
- [x] Update `src/renderer/services/catalyst/catalyst-service.ts`
- [x] Remove deprecated `getAvailableAgents` method - NOT FOUND
- [x] Remove deprecated `getActiveExecutions` method - NOT FOUND
- [x] Replace remaining manual unwrapping with `unwrapAPI`
- [x] Test catalyst operations

### Task 3.2: Knowledge Service
- [x] Update `src/renderer/services/discovery/discovery-service.ts` (knowledge-related)
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test knowledge operations

### Task 3.3: Content Service
- [x] Content operations handled by discovery service
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test content operations

## Priority 4: Other Services

### Task 4.1: Agent Service
- [x] Update `src/renderer/services/agents/agent-service.ts`
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test agent operations

### Task 4.2: Configuration Service
- [x] Update `src/renderer/services/configuration/configuration-service.ts`
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test configuration operations

### Task 4.3: Practice Service
- [x] Practice operations handled by discovery service
- [x] Replace all manual unwrapping with `unwrapAPI`
- [x] Test practice operations

## Testing & Validation

### Task 5.1: Unit Tests
- [x] Update `src/renderer/services/file/__tests__/file-service.test.ts` - Tests already work correctly
- [x] Update `src/renderer/services/chat/__tests__/chat-service.test.ts` - Tests already work correctly
- [x] Update other service test files - Tests already work correctly
- [x] Verify all tests pass

### Task 5.2: Integration Tests
- [x] Test IPC flow end-to-end - All tests pass
- [x] Verify error toasts display correctly - Verified through integration tests
- [x] Test silent mode functionality - Built into unwrapAPI
- [x] Test error boundary handling - Already tested in existing test suite

### Task 5.3: Manual Testing
- [x] Test file explorer (LocalProjectExplorer) - Works correctly
- [x] Test chat interface - Works correctly
- [x] Test session management - Works correctly
- [x] Test settings panel - Works correctly
- [x] Test progress dashboard - Works correctly

### Task 5.4: Code Validation
- [x] Run `rg "response\?\.data" src/renderer` - should find NO results
- [x] Run `rg "unwrapAPI" src/renderer` - should find usage
- [x] Run TypeScript type check - All type checks pass
- [x] Run ESLint - All linting passes

## Documentation

### Task 6.1: Developer Guide
- [x] Update `docs/DEVELOPER-GUIDE/electron-api.md`
- [x] Add IPC calling patterns section
- [x] Document `unwrapAPI` usage
- [x] Add migration examples

### Task 6.2: Code Comments
- [x] Add comments explaining `unwrapAPI` pattern
- [x] Document error handling approach
- [x] Reference this OpenSpec change

## Completion Checklist

- [x] All Priority 1 tasks complete (File & Chat services)
- [x] All Priority 2 tasks complete (Session, Settings, Analytics)
- [x] All Priority 3 tasks complete (Catalyst, Knowledge, Content)
- [x] All Priority 4 tasks complete (remaining services)
- [x] All tests pass
- [x] Manual testing complete
- [x] Code validation complete
- [x] Documentation updated
- [x] No manual unwrapping patterns remain (for wrapped APIs)
- [x] No runtime errors from object rendering
- [x] Error handling is consistent across all services

## Notes

- Focus on Priority 1 first to fix critical bugs
- Test each service after updating
- Keep changes minimal and focused
- Reference `unwrapAPI` helper for consistency
- Use `{silent: true}` option for background operations
- **IMPORTANT**: Some APIs (file system, some session methods) return raw data, not wrapped responses - these should NOT use unwrapAPI
- This distinction was identified during type checking and fixed accordingly
