# Task Checklist: Standardize Renderer IPC Calls

## Priority 1: Critical Services (Fix Runtime Bugs)

### Task 1.1: File Service
- [ ] Update `src/renderer/services/file/file-service.ts`
- [ ] Import `unwrapAPI` from `@/renderer/hooks/useElectronAPI`
- [ ] Replace manual unwrapping in `readDirectory` method
- [ ] Replace manual unwrapping in `readFile` method
- [ ] Replace manual unwrapping in `writeFile` method
- [ ] Replace manual unwrapping in `existsFile` method
- [ ] Replace manual unwrapping in `getWorkspacePath` method
- [ ] Test file operations work correctly
- [ ] Verify error toasts display on failures

### Task 1.2: Chat Service
- [ ] Update `src/renderer/services/chat/chat-service.ts`
- [ ] Import `unwrapAPI` from `@/renderer/hooks/useElectronAPI`
- [ ] Replace manual unwrapping in `sendMessage` method
- [ ] Replace manual unwrapping in `getMessages` method
- [ ] Replace manual unwrapping in `generateTitle` method
- [ ] Test chat functionality works correctly
- [ ] Verify error handling is consistent

## Priority 2: High-Usage Services

### Task 2.1: Session Service
- [ ] Update `src/renderer/services/sessions/session-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test session operations

### Task 2.2: Settings Service
- [ ] Update `src/renderer/services/settings/settings-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test settings operations

### Task 2.3: Analytics Service
- [ ] Update `src/renderer/services/analytics/analytics-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test analytics operations

## Priority 3: Catalyst & Knowledge Services

### Task 3.1: Catalyst Service
- [ ] Update `src/renderer/services/catalyst/catalyst-service.ts`
- [ ] Remove deprecated `getAvailableAgents` method
- [ ] Remove deprecated `getActiveExecutions` method
- [ ] Replace remaining manual unwrapping with `unwrapAPI`
- [ ] Test catalyst operations

### Task 3.2: Knowledge Service
- [ ] Update `src/renderer/services/knowledge/knowledge-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test knowledge operations

### Task 3.3: Content Service
- [ ] Update `src/renderer/services/content/content-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test content operations

## Priority 4: Other Services

### Task 4.1: Agent Service
- [ ] Update `src/renderer/services/agents/agent-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test agent operations

### Task 4.2: Configuration Service
- [ ] Update `src/renderer/services/configuration/configuration-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test configuration operations

### Task 4.3: Practice Service
- [ ] Update `src/renderer/services/practice/practice-service.ts`
- [ ] Replace all manual unwrapping with `unwrapAPI`
- [ ] Test practice operations

## Testing & Validation

### Task 5.1: Unit Tests
- [ ] Update `src/renderer/services/file/__tests__/file-service.test.ts`
- [ ] Update `src/renderer/services/chat/__tests__/chat-service.test.ts`
- [ ] Update other service test files
- [ ] Verify all tests pass

### Task 5.2: Integration Tests
- [ ] Test IPC flow end-to-end
- [ ] Verify error toasts display correctly
- [ ] Test silent mode functionality
- [ ] Test error boundary handling

### Task 5.3: Manual Testing
- [ ] Test file explorer (LocalProjectExplorer)
- [ ] Test chat interface
- [ ] Test session management
- [ ] Test settings panel
- [ ] Test progress dashboard

### Task 5.4: Code Validation
- [ ] Run `rg "response\?\.data" src/renderer` - should find NO results
- [ ] Run `rg "unwrapAPI" src/renderer` - should find usage
- [ ] Run TypeScript type check
- [ ] Run ESLint

## Documentation

### Task 6.1: Developer Guide
- [ ] Update `docs/DEVELOPER-GUIDE/electron-api.md`
- [ ] Add IPC calling patterns section
- [ ] Document `unwrapAPI` usage
- [ ] Add migration examples

### Task 6.2: Code Comments
- [ ] Add comments explaining `unwrapAPI` pattern
- [ ] Document error handling approach
- [ ] Reference this OpenSpec change

## Completion Checklist

- [ ] All Priority 1 tasks complete (File & Chat services)
- [ ] All Priority 2 tasks complete (Session, Settings, Analytics)
- [ ] All Priority 3 tasks complete (Catalyst, Knowledge, Content)
- [ ] All Priority 4 tasks complete (remaining services)
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Code validation complete
- [ ] Documentation updated
- [ ] No manual unwrapping patterns remain
- [ ] No runtime errors from object rendering
- [ ] Error handling is consistent across all services

## Notes

- Focus on Priority 1 first to fix critical bugs
- Test each service after updating
- Keep changes minimal and focused
- Reference `unwrapAPI` helper for consistency
- Use `{silent: true}` option for background operations
