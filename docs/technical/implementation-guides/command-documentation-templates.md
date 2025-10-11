# Command Documentation Templates

---
title: Command Documentation Templates Guide
description: Standardized templates and guidelines for creating comprehensive Learning Catalyst CLI command documentation
version: 1.0.0
last_updated: 2025-10-09
difficulty: "Beginner"
estimated_time: "15 minutes"
---

## Overview

This guide provides standardized templates for creating consistent, high-quality documentation for Learning Catalyst CLI commands. These templates ensure uniform structure, formatting, and user experience across all command documentation.

## Command Reference Template

Use this template for individual command documentation pages:

```markdown
# `/[command]` - [Brief, Action-Oriented Description]

**Aliases**: `/[alias1]`, `/[alias2]` (if applicable)
**Category**: [System|Configuration|Learning|Analytics|Session|Context]
**Status**: [✅ Fully Implemented | 🔄 In Development | 📝 Planned]

## Quick Overview
[Brief one-paragraph explanation of what the command does and when to use it. Focus on the user's goal, not technical details.]

## Syntax
```bash
/[command] [required-argument] [optional-argument] [options]
```

## Parameters
- `required-argument` (required): [Clear description of what this parameter does and what values are accepted]
- `optional-argument` (optional): [Description with default value if applicable]
- `--option` (optional): [Flag description with behavior explanation]

## Usage Examples

### Basic Usage
```bash
Learning Catalyst > /[command] [basic-arguments]
[Realistic sample output showing exactly what users should expect]
```

### Advanced Usage
```bash
Learning Catalyst > /[command] [advanced-arguments] --option
[Sample output showing advanced functionality or special cases]
```

### Common Workflows
```bash
# Example 1: [Specific use case with clear goal]
Learning Catalyst > /[command] [workflow-arguments]
[Output and explanation of what happened]

# Example 2: [Different use case or scenario]
Learning Catalyst > /[command] [different-arguments]
[Output and explanation of results]
```

## Tips and Best Practices
- ✅ **Best Practice**: [Actionable recommendation for effective usage]
- ⚠️ **Common Pitfall**: [Warning about common mistakes and how to avoid them]
- 💡 **Pro Tip**: [Advanced usage tip for experienced users]

## Related Commands
- **`/[related-command1]`**: [How it relates to current command and when to use together]
- **`/[related-command2]`**: [When to use this instead or in combination]

## Troubleshooting

### Common Issues
**Issue**: [Common problem users face with clear, recognizable symptoms]
```
[Example error message or behavior users will see]
```
**Solution**: [Clear, step-by-step resolution approach]

**Issue**: [Another common problem with specific context]
```
[Error message or unexpected behavior]
```
**Solution**: [Direct solution with verification steps]

## See Also
- [Link to category overview](category-overview.md)
- [Link to related feature documentation](../features/feature-name.md)
- [Link to examples showing this command in action](../examples/workflows.md)
```

## Category Overview Template

Use this template for category introduction pages that group related commands:

```markdown
# [Category] Commands - [Category Purpose Statement]

## Overview
[Category introduction explaining the purpose and common use cases for this command group. Focus on what users can accomplish with these commands.]

## Available Commands

| Command | What It Does | Common Use Case |
|---------|--------------|-----------------|
| **`/[command1]`** | [Brief description focused on user benefit] | [Primary use case with goal] |
| **`/[command2]`** | [Brief description focused on user benefit] | [Primary use case with goal] |
| **`/[command3]`** | [Brief description focused on user benefit] | [Primary use case with goal] |

## Common Workflows

### [Workflow Name] - [Goal of Workflow]
```bash
# Step 1: [Action description with purpose]
Learning Catalyst > /[command1] [arguments]

# Step 2: [Action description with purpose]
Learning Catalyst > /[command2] [arguments]

# Step 3: [Action description with purpose]
Learning Catalyst > /[command3] [arguments]
```
**Use When**: [Clear description of when to use this workflow]
**Result**: [What users achieve with this workflow]

### [Another Workflow Name] - [Goal of Workflow]
```bash
# Single command workflow for specific goal
Learning Catalyst > /[command] [arguments] --option
```
**Use When**: [When to use this approach]
**Result**: [Expected outcome]

## Getting Started

### First Time Setup
```bash
# Initial configuration for new users
Learning Catalyst > /[setup-command]

# Verify setup is working correctly
Learning Catalyst > /[verification-command]
```

### Daily Usage
```bash
# Check current status (common daily task)
Learning Catalyst > /[status-command]

# Perform common task
Learning Catalyst > /[task-command]
```

## Tips for [Category] Commands
- **Workflow Tip**: [Category-specific workflow recommendation that saves time or improves results]
- **Efficiency Tip**: [How to use these commands more effectively or combine them]
- **Integration Tip**: [How these commands work with other categories or features]

## Related Documentation
- **[Previous Category]**: [Link to previous command category if applicable]
- **[Next Category]**: [Link to next command category if applicable]
- **[Feature Documentation]**: [Link to related features or guides]

## Quick Reference Card
```bash
# Essential commands in this category for quick access
/[command1]              # [One-line description of primary benefit]
/[command2] [arg]        # [One-line description of primary benefit]
/[command3] --option     # [One-line description of primary benefit]
```
```

## Mini-Reference Template

Use this template for quick reference sections or brief command mentions:

```markdown
### `/[command]` - [One-line description]
**Syntax**: `/[command] [arguments]`
**Use for**: [Primary use case or goal]
**Example**: `Learning Catalyst > /[command] [example-arguments]`
```

## Field Guidelines

### Command Names and Syntax
- **Format**: Use backticks for all command names: `/help`
- **Arguments**: Use brackets for optional items: `[argument]`
- **Required items**: Use angle brackets: `<required-argument>`
- **Multiple choices**: Use pipes: `option1|option2`
- **Flags**: Use dashes: `--verbose`, `-f`

### Parameter Descriptions
- **Required**: Clearly state "required" and what values are accepted
- **Optional**: Include default values when applicable
- **Types**: Specify data types (string, number, boolean, etc.)
- **Validation**: Mention any validation rules or constraints

### Example Formatting
- **Realistic**: Use believable inputs and outputs
- **Complete**: Show full command with all necessary parts
- **Consistent**: Use same prompt format: `Learning Catalyst > `
- **Clear**: Include explanatory comments when needed

### Status Indicators
- ✅ **Fully Implemented**: Command is complete and working
- 🔄 **In Development**: Command exists but may have limited functionality
- 📝 **Planned**: Command is planned but not yet implemented
- ⚠️ **Deprecated**: Command exists but will be removed

## Content Guidelines

### Writing Style
- **Active Voice**: "Use this command to..." instead of "This command is used to..."
- **User Focus**: Describe what users can accomplish, not technical implementation
- **Clear Language**: Avoid jargon and technical terms when possible
- **Consistent Terminology**: Use same terms throughout all documentation

### Structure Guidelines
- **Progressive Disclosure**: Start simple, add complexity gradually
- **Logical Flow**: Organize content from basic to advanced
- **Clear Hierarchy**: Use headings to guide readers through content
- **Scannable**: Use formatting to make content easy to scan

### Example Quality Standards
- **Realistic**: Examples should work with actual command behavior
- **Complete**: Show full command including all necessary parts
- **Varied**: Include different use cases and scenarios
- **Explanatory**: Add comments for complex or non-obvious examples

## Cross-Reference Guidelines

### Internal Links
- **Command Links**: Link to specific command pages: [`/help`](help.md)
- **Category Links**: Link to category overviews: [Configuration Commands](configuration.md)
- **Feature Links**: Link to feature documentation when relevant

### External References
- **Related Docs**: Link to relevant documentation in other sections
- **Examples**: Link to practical examples when available
- **API Docs**: Link to API documentation for technical details

## Quality Checklist

### Content Quality
- [ ] All command syntax is accurate and complete
- [ ] Examples are realistic and tested against actual behavior
- [ ] Parameters are clearly described with types and validation
- [ ] Use cases are clear and actionable
- [ ] Troubleshooting covers common issues and solutions

### Formatting Standards
- [ ] Markdown formatting is consistent and correct
- [ ] Code blocks use proper syntax highlighting
- [ ] Tables are properly formatted and aligned
- [ ] Links work and point to relevant content
- [ ] Headings follow logical hierarchy

### User Experience
- [ ] Content is written from user perspective
- [ ] Language is clear and accessible
- [ ] Examples show expected outputs
- [ ] Progressive complexity from basic to advanced
- [ ] Cross-references help users discover related content

## Template Usage Examples

### Completed Example - Simple Command
```markdown
# `/clear` - Clear Terminal Screen

**Aliases**: `/cls`
**Category**: System
**Status**: ✅ Fully Implemented

## Quick Overview
Clear the terminal screen to provide a clean workspace for continued learning or to organize your workflow.

## Syntax
```bash
/clear [--preserve] [--reset]
```

## Parameters
- `--preserve` (optional): Clear screen but keep recent command history visible
- `--reset` (optional): Full terminal state reset (use if display issues occur)

## Usage Examples

### Basic Usage
```bash
Learning Catalyst > /clear
[Screen clears, showing only fresh prompt]
Learning Catalyst >
```

### Preserve History
```bash
Learning Catalyst > /clear --preserve
[Screen clears but last few commands remain visible]
```

## Tips and Best Practices
- ✅ **Best Practice**: Use `/clear` when switching between different learning topics
- ⚠️ **Common Pitfall**: Command history is preserved even when screen is cleared
- 💡 **Pro Tip**: Use `/clear --reset` if you encounter display formatting issues

## Related Commands
- **`/help`**: Often used after clearing screen to see available commands
- **`/reset`**: More comprehensive session reset if needed

## Troubleshooting

### Common Issues
**Issue**: Screen doesn't clear completely or shows formatting artifacts
```
Learning Catalyst > /clear
[Partial clear with strange characters or formatting]
```
**Solution**: Use `/clear --reset` for full terminal state reset
```

## See Also
- [System Commands Overview](system.md)
- [Session Management](session.md)
```

This template system ensures consistent, high-quality documentation across all Learning Catalyst CLI commands while maintaining flexibility for different command types and complexity levels.