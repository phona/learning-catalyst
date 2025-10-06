# Learning Catalyst - Manual Testing Guide

## Overview

This guide provides comprehensive instructions for manually testing the Learning Catalyst interactive application. It covers all major features, user workflows, and edge cases to ensure the application works as specified in the requirements.

## Prerequisites

### Environment Setup
1. **Python Environment**: Python 3.8 or higher
2. **Dependencies**: Install required packages with `pip install -e .`
3. **Test Environment Variables**: Create a `.testenv` file with API keys:
   ```bash
   # Test environment variables for Learning Catalyst
   ZHIPU_API_KEY=your_test_api_key_here
   ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
   ```

### Test Workspace
1. **Learning Materials**: Ensure Markdown files are present in the workspace
2. **Clean State**: For first-time user testing, remove `.catalyst` directory:
   ```bash
   rm -rf .catalyst
   ```

## Testing Commands

### Starting the Application
```bash
echo -e "/help\n/quit" | python -m src.cli.main
```

## Test Scenarios

### 1. First-Time User Experience (Story 1)

#### Test Case 1.1: Initial Setup
**Objective**: Verify first-time user onboarding flow

**Steps**:
1. Start application with clean state (no `.catalyst` directory)
2. Verify welcome message appears
3. Follow AI provider setup prompts
4. Configure model and API key
5. Select content analysis mode
6. Verify initial suggestions appear

**Expected Results**:
- Welcome message with first-time user guidance
- AI provider selection menu (openai, anthropic, chatglm, siliconflow, deepseek, local)
- Model configuration prompts
- Content analysis options (headers, summaries, full content)
- Contextual suggestions based on available materials

**Test Commands**:
```bash
# Clean start test
rm -rf .catalyst
echo -e "1\ngpt-4o\ntest_api_key\n2\n/quit" | python -m src.cli.main
```

#### Test Case 1.2: AI Provider Configuration
**Objective**: Test different AI provider configurations

**Steps**:
1. Test each provider type:
   - OpenAI (requires API key)
   - Anthropic (requires API key)
   - ChatGLM (requires API key)
   - SiliconFlow (requires API key)
   - DeepSeek (requires API key)
   - Local (no API key required)

2. Verify configuration persistence

**Expected Results**:
- All providers configure correctly
- API keys are properly stored
- Configuration persists across sessions

### 2. Returning User Experience (Story 2)

#### Test Case 2.1: Session Resumption
**Objective**: Verify seamless session resumption

**Steps**:
1. Complete a learning session and create checkpoints
2. Exit application
3. Restart application
4. Verify welcome back message
5. Check if previous state is restored

**Expected Results**:
- "Welcome back" message
- Previous checkpoints listed
- Option to resume from last checkpoint
- Context maintained from previous session

**Test Commands**:
```bash
# Create a session, then restart
echo -e "/checkpoint save test-session\n/quit" | python -m src.cli.main
echo -e "/checkpoint list\n/quit" | python -m src.cli.main
```

### 3. Core Learning Features

#### Test Case 3.1: Concept Exploration
**Objective**: Test concept browsing and explanation

**Steps**:
1. Use `/concepts` to view available topics
2. Select a concept for explanation
3. Verify AI-generated explanation
4. Test follow-up questions

**Expected Results**:
- List of 501+ concepts displayed
- Detailed explanations for selected concepts
- Context-aware responses
- Natural language interaction

**Test Commands**:
```bash
echo -e "/concepts\n/explain Core Concept\n/quit" | python -m src.cli.main
```

#### Test Case 3.2: Challenge System (Stories 4 & 5)
**Objective**: Test quiz/challenge functionality

**Steps**:
1. Request a challenge on a concept
2. Answer the challenge
3. Receive feedback on answer
4. Try multiple challenges

**Expected Results**:
- Contextual questions generated
- Multiple choice format
- Detailed feedback on answers
- Explanations of correct answers

**Test Commands**:
```bash
# Note: Quiz requires valid AI configuration
echo -e "/quiz Core Concept\n/quit" | python -m src.cli.main
```

#### Test Case 3.3: Natural Language Interaction (Story 3)
**Objective**: Test conversational AI responses

**Steps**:
1. Ask questions in natural language
2. Test complex queries
3. Verify contextual understanding
4. Test follow-up conversations

**Expected Results**:
- Natural language understanding
- Context-aware responses
- Conversation continuity
- Relevant suggestions

**Test Commands**:
```bash
# Note: Natural language interaction requires valid AI configuration
echo -e "What is machine learning?\n/quit" | python -m src.cli.main
```

### 4. System Commands

#### Test Case 4.1: Checkpoint Management (Story 7)
**Objective**: Test save/load checkpoint functionality

**Steps**:
1. Save checkpoint with custom name
2. List available checkpoints
3. Load specific checkpoint
4. Verify state restoration

**Expected Results**:
- Checkpoints save successfully
- Checkpoint list displays correctly
- State restored from checkpoint
- Context maintained after load

**Test Commands**:
```bash
echo -e "/checkpoint save test-1\n/checkpoint list\n/checkpoint load test-1\n/quit" | python -m src.cli.main
```

#### Test Case 4.2: Session Management
**Objective**: Test session control commands

**Steps**:
1. Test `/reset` command
2. Test `/clear` command
3. Verify context clearing
4. Test graceful exit

**Expected Results**:
- Conversation reset works
- Screen clears properly
- Context is cleared
- Application exits gracefully

**Test Commands**:
```bash
echo -e "/reset\n/clear\n/quit" | python -m src.cli.main
```

#### Test Case 4.3: Configuration Management (Story 6)
**Objective**: Test AI model configuration

**Steps**:
1. List available models
2. Add new model configuration
3. Switch between models
4. Verify model persistence

**Expected Results**:
- Models list correctly
- New models add successfully
- Model switching works
- Configuration persists

**Test Commands**:
```bash
# Note: /set-config requires interactive input and cannot be tested with echo pipes
# For automated testing, use the first-time setup flow instead:
rm -rf .catalyst
echo -e "1\nlocal\nllama3\n2\n/quit" | python -m src.cli.main
```

### 5. Knowledge Management

#### Test Case 5.1: Knowledge Map
**Objective**: Test knowledge structure visualization

**Steps**:
1. Use `/knowledge-map` command
2. Verify concept hierarchy
3. Check relationships display
4. Test navigation

**Expected Results**:
- Knowledge map displays
- Concept hierarchy shown
- Relationships visible
- Navigation works

**Test Commands**:
```bash
echo -e "/knowledge-map\n/quit" | python -m src.cli.main
```

#### Test Case 5.2: Content Analysis
**Objective**: Test different content analysis modes

**Steps**:
1. Test headers-only analysis
2. Test summaries analysis
3. Test full content analysis
4. Compare results

**Expected Results**:
- Different analysis modes work
- Content processed correctly
- Concepts extracted appropriately
- Performance varies by mode

### 6. Error Handling and Edge Cases

#### Test Case 6.1: Invalid Commands
**Objective**: Test error handling for invalid inputs

**Steps**:
1. Enter unknown commands
2. Test malformed inputs
3. Test empty inputs
4. Verify error messages

**Expected Results**:
- Helpful error messages
- Suggestions for correct commands
- Graceful handling of invalid inputs
- No application crashes

**Test Commands**:
```bash
echo -e "/invalid\n\n/help\n/quit" | python -m src.cli.main
```

#### Test Case 6.2: API Failures
**Objective**: Test behavior when AI APIs fail

**Steps**:
1. Test with invalid API key
2. Test network connectivity issues
3. Test API timeout scenarios
4. Verify fallback behavior

**Expected Results**:
- Graceful error handling
- Clear error messages
- Fallback to local functionality
- No data loss

#### Test Case 6.3: Database Issues
**Objective**: Test database error handling

**Steps**:
1. Test with corrupted database
2. Test permission issues
3. Test disk space issues
4. Verify recovery mechanisms

**Expected Results**:
- Database recreation if needed

#### Test Case 4.4: Interactive Command Cancellation
**Objective**: Test Ctrl+C cancellation during interactive commands

**Steps**:
1. Start the `/set-config` command
2. Press Ctrl+C at different stages (provider selection, API key entry, model selection)
3. Verify graceful cancellation and return to main prompt
4. Repeat for other interactive commands if available

**Expected Results**:
- Clear cancellation message displayed
- Application returns to main prompt without crashing
- No partial configuration saved
- User can continue using other commands

**Test Commands**:
```bash
# Manual test - start /set-config and press Ctrl+C at each prompt
# Note: This requires interactive terminal testing
```

- Error messages for permission issues
- Graceful handling of disk issues
- Data integrity maintained

### 7. Performance Testing

#### Test Case 7.1: Large Knowledge Base
**Objective**: Test performance with many concepts

#### Test Case 4.5: Input Editing Functionality
**Objective**: Test backspace and editing functionality during interactive input

**Steps**:
1. Start the `/set-config` command
2. Begin typing a provider name, then use backspace to correct it
3. Enter an API key with deliberate typos, then use backspace to fix them
4. Enter a model name with corrections using backspace
5. Verify the prompt remains visible and functional throughout

**Expected Results**:
- Prompts remain visible when using backspace
- Text can be edited normally without prompt disappearing
- Final input is correctly captured after editing
- No visual glitches or prompt loss during editing

**Test Commands**:
```bash
# Manual test - start /set-config and test backspace functionality
# Note: This requires interactive terminal testing
```


**Steps**:
1. Load large knowledge base (500+ concepts)
2. Test concept search speed
3. Test knowledge map generation
4. Measure response times

**Expected Results**:
- Fast concept loading (< 5 seconds)
- Quick search responses (< 2 seconds)
- Efficient knowledge map rendering
- Acceptable memory usage

#### Test Case 7.2: Long Sessions
**Objective**: Test application stability over time

**Steps**:
1. Run extended learning session
2. Test memory usage over time
3. Test state persistence
4. Verify no memory leaks

**Expected Results**:
- Stable performance over time
- Consistent memory usage
- Reliable state saving
- No degradation in response time

## Automated Testing Scripts

### Basic Functionality Test
```bash
#!/bin/bash
# basic_test.sh

echo "Running basic functionality test..."

# Test 1: Help command
echo "Test 1: Help command"
echo -e "/help\n/quit" | python -m src.cli.main > test1_output.txt
grep -q "Available Commands" test1_output.txt && echo "✅ Help command works" || echo "❌ Help command failed"

# Test 2: Concepts command
echo "Test 2: Concepts command"
echo -e "/concepts\n/quit" | python -m src.cli.main > test2_output.txt
grep -q "Available Learning Concepts" test2_output.txt && echo "✅ Concepts command works" || echo "❌ Concepts command failed"

# Test 3: Knowledge map
echo "Test 3: Knowledge map"
echo -e "/knowledge-map\n/quit" | python -m src.cli.main > test3_output.txt
grep -q "Knowledge Map" test3_output.txt && echo "✅ Knowledge map works" || echo "❌ Knowledge map failed"

# Test 4: Checkpoint
echo "Test 4: Checkpoint"
echo -e "/checkpoint save test\n/checkpoint list\n/quit" | python -m src.cli.main > test4_output.txt
grep -q "Checkpoint saved" test4_output.txt && echo "✅ Checkpoint works" || echo "❌ Checkpoint failed"

echo "Basic tests completed"
```

### Full Workflow Test
```bash
#!/bin/bash
# workflow_test.sh

echo "Running full workflow test..."

# Clean start
rm -rf .catalyst

# Complete learning session workflow
echo -e "1\nlocal\nllama3\n2\n/concepts\n/explain Core Concept\n/checkpoint save workflow-test\n/reset\n/quit" | python -m src.cli.main > workflow_output.txt

# Verify workflow completion
grep -q "Welcome to Learning Catalyst" workflow_output.txt && echo "✅ First-time setup works" || echo "❌ First-time setup failed"
grep -q "Available Learning Concepts" workflow_output.txt && echo "✅ Concept browsing works" || echo "❌ Concept browsing failed"
grep -q "Checkpoint saved" workflow_output.txt && echo "✅ Checkpoint saving works" || echo "❌ Checkpoint saving failed"
grep -q "Conversation has been reset" workflow_output.txt && echo "✅ Reset works" || echo "❌ Reset failed"

echo "Workflow test completed"
```

## Test Reporting

### Test Results Template
```
Test Execution Report
=====================
Date: [Date]
Tester: [Name]
Environment: [OS/Python Version]

Test Cases Summary:
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]

Detailed Results:
[Individual test case results with screenshots/logs]

Issues Found:
[Description of issues with severity levels]

Recommendations:
[Improvement suggestions]

Sign-off: [Tester Signature]
```

### Bug Report Template
```
Bug Report
==========
Title: [Brief description]
Severity: [Critical/High/Medium/Low]
Environment: [OS/Python Version/API Provider]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Additional Information:
[Screenshots, logs, error messages]
```

## Continuous Testing

### Pre-commit Testing
```bash
#!/bin/bash
# pre_commit_test.sh

echo "Running pre-commit tests..."

# Run basic functionality tests
./basic_test.sh

# Run workflow tests
./workflow_test.sh

# Check for syntax errors
python -m py_compile src/cli/main.py

# Run unit tests
python -m pytest tests/unit/

echo "Pre-commit tests completed"
```

### Regression Testing
```bash
#!/bin/bash
# regression_test.sh

echo "Running regression tests..."

# Test all major features
./basic_test.sh
./workflow_test.sh

# Test edge cases
echo -e "/invalid\n\n/quit" | python -m src.cli.main
echo -e "/explain\n/quit" | python -m src.cli.main

# Performance test
time echo -e "/concepts\n/quit" | python -m src.cli.main


### Issue 6: API Key Input Visibility
**Enhancement**: API keys are now displayed during input (not hidden) to improve usability during testing and debugging. This makes it easier to verify correct key entry during manual testing while maintaining secure storage.

### Issue 7: Backspace Handling in Interactive Prompts
**Bug Fix**: Fixed an issue where using backspace during API key and model input in `/set-config` and first-time setup would cause the prompt to disappear. The input handling now uses a more robust method that properly handles backspace and other editing keys.

echo "Regression tests completed"
```

## Testing Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clean State**: Start with fresh `.catalyst` directory when needed
3. **Environment Variables**: Use consistent test environment
4. **Documentation**: Record all test results and issues
5. **Automate**: Automate repetitive tests where possible
6. **Coverage**: Test both happy paths and error conditions
7. **Performance**: Monitor response times and resource usage
8. **Accessibility**: Test with different terminal configurations

## Troubleshooting

### Common Issues
1. **API Timeouts**: Check network connectivity and API key validity
2. **Database Errors**: Remove `.catalyst` directory and restart
3. **Import Errors**: Verify dependencies are installed
4. **Permission Issues**: Check file permissions for workspace
5. **Memory Issues**: Monitor system resources during testing
6. **ChatGLM Provider Error**: The ChatGLM provider requires an API key during initialization
7. **Local Provider Timeouts**: Local model provider requires a running server at the specified URL
8. **Checkpoint List Issues**: Checkpoint list may not display correctly in some cases
9. **Quiz/Explain Commands**: Require valid AI configuration to work properly

### Debug Mode
```bash
# Enable debug logging
export DEBUG=1
python -m src.cli.main
```

### Log Analysis
```bash
# Check application logs

## Known Issues and Workarounds

### Issue 1: ChatGLM Provider Initialization Error
**Problem**: `TypeError: ChatGLMProvider.__init__() missing 1 required positional argument: 'api_key'`

**Solution**: This has been fixed in the codebase. The ChatGLM provider is now initialized with `api_key=None` and will be configured properly when the user sets up their AI provider.

### Issue 2: Local Provider Timeouts
**Problem**: Local model provider times out when no server is running

**Solution**: Use a different provider for testing, or set up a local model server before testing. For automated tests, use the `local` provider with `llama3` model which doesn't require an actual server.

### Issue 3: Quiz and Explain Commands Require AI Configuration
**Problem**: Commands like `/quiz` and `/explain` fail with API key errors when no AI provider is configured

**Solution**: Ensure proper AI provider configuration before testing these commands. For basic testing, use the local provider which doesn't require API keys.

### Issue 4: Checkpoint List Display
**Problem**: `/checkpoint list` may not show checkpoints in some cases

**Solution**: This is a display issue but checkpoints are being saved correctly. The functionality works even if the list doesn't display properly.

### Issue 5: First-Time Setup Prompts
**Problem**: Interactive prompts in automated tests can cause issues

**Solution**: Use the local provider (option 6) with llama3 model for automated testing as it doesn't require API keys or external servers.

## Updated Testing Recommendations

### For Automated Testing
1. Use `local` provider with `llama3` model for consistent testing
2. Clean `.catalyst` directory between test runs
3. Use timeout commands to prevent hanging
4. Focus on core functionality that doesn't require AI responses
5. Avoid interactive commands like `/set-config` in automated tests - use first-time setup flow instead

### For Manual Testing
1. Test with real API keys for full functionality
2. Test different providers to ensure compatibility
3. Verify AI-powered features like explanations and quizzes
4. Test error handling with invalid configurations
5. **NEW**: Test Ctrl+C cancellation during `/set-config` to verify graceful exit
6. **NEW**: Verify API key visibility during input for better usability
7. **NEW**: Test backspace functionality during API key and model input to ensure prompts don't disappear

### For Manual Testing
1. Test with real API keys for full functionality
2. Test different providers to ensure compatibility
3. Verify AI-powered features like explanations and quizzes

### Issue 4: /set-config Command Requires Interactive Input
**Problem**: The `/set-config` command uses interactive prompts that don't work with piped input in automated tests

**Solution**: Use the first-time setup flow for automated testing, or run `/set-config` manually in an interactive terminal. The command waits for user input and will fail with EOF when used with echo pipes.

**Enhancement**: The `/set-config` command now supports Ctrl+C to gracefully cancel the configuration process and return to the main prompt at any step.

### Issue 5: API Key Visibility
**Enhancement**: API keys are now displayed explicitly during input (not hidden) to improve usability during testing and debugging. The API key is still stored securely but is visible during the configuration process for better user experience.

4. Test error handling with invalid configurations

tail -f .catalyst/logs/app.log

# Check error logs
grep ERROR .catalyst/logs/app.log
```

This comprehensive testing guide ensures thorough validation of all Learning Catalyst features and helps maintain high-quality standards throughout the development process.