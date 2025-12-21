# OpenSpec Agent Instructions

This file contains instructions for AI agents working with OpenSpec changes.

## OpenSpec Workflow

1. **Create Change**: Use `openspec:proposal` to scaffold a new change
2. **Review Change**: Review proposal, design, and tasks
3. **Apply Change**: Use `openspec:apply` to implement the change
4. **Archive Change**: Use `openspec:archive` when complete

## Agent Responsibilities

- Keep changes minimal and focused
- Follow acceptance criteria strictly
- Update task checklist when complete
- Reference OpenSpec specs when needed

## File Structure

```
openspec/changes/<change-id>/
├── proposal.md          # Change proposal
├── design.md            # Technical design (optional)
├── tasks.md             # Task checklist
└── specs/               # Test/spec files
```

## Commands

- `openspec list` - List all changes
- `openspec show <id>` - Show change details
- `openspec update` - Refresh instructions
