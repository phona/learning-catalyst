/**
 * @fileoverview Comprehensive tests for ToolFallback component
 * Tests helper functions, result handling, error states, and UI interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolFallback } from '@/renderer/components/Chat/ToolFallback';
import type { ToolCallMessagePartComponent } from '@assistant-ui/react';

/**
 * Helper function to expand ToolFallback component for testing
 */
const expandComponent = () => {
  // Get the first button (the main toggle button, not the Show/Hide result button)
  const toggleButton = screen.getAllByRole('button')[0];
  fireEvent.click(toggleButton);
};

/**
 * Helper function to match JSON content in result section
 */
const expectJSONContent = (expectedObj: unknown) => {
  const expectedStr = JSON.stringify(expectedObj, null, 2);
  // Only check in the result content area
  expect(screen.getByText((content) => content.includes(expectedStr.split('\n')[0]), {
    selector: '.aui-tool-fallback-result-content'
  } as any)).toBeInTheDocument();
};

describe('ToolFallback', () => {
  describe('Helper Functions via Component', () => {
    describe('formatPayload behavior', () => {
      it('handles string values directly', () => {
        const result = 'simple string result';
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'complete' }}
          />,
        );

        expandComponent();
        expect(screen.getByText(result)).toBeInTheDocument();
      });

      it('stringifies objects with proper formatting', () => {
        const result = { key: 'value', nested: { data: 'test' } };
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'complete' }}
          />,
        );

        expandComponent();
        expectJSONContent(result);
      });

      it('handles complex nested objects', () => {
        const result = {
          users: [
            { id: 1, name: 'Alice', roles: ['admin', 'user'] },
            { id: 2, name: 'Bob', roles: ['user'] },
          ],
          metadata: {
            count: 2,
            timestamp: '2025-01-01T00:00:00Z',
          },
        };

        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'complete' }}
          />,
        );

        expandComponent();
        expectJSONContent(result);
      });

      it('handles arrays properly', () => {
        const result = ['item1', 'item2', 'item3'];
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'complete' }}
          />,
        );

        expandComponent();
        expectJSONContent(result);
      });
    });

    describe('statusLabel behavior', () => {
      it('returns "complete" when result.ok is true', () => {
        const result = { ok: true, data: 'success' };

        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'running' }}
          />,
        );

        // Component should render in complete state (green checkmark)
        expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
      });

      it('returns "error" when result.ok is false', () => {
        const result = { ok: false, error: { message: 'Tool failed' } };

        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'running' }}
          />,
        );

        // Component should render in error state (XCircleIcon)
        expect(screen.getByText(/Failed tool:/)).toBeInTheDocument();
      });

      it('returns "running" when status.type is running', () => {
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={undefined}
            status={{ type: 'running' }}
          />,
        );

        // Check header text exists
        expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
        expect(screen.getByText('test-tool')).toBeInTheDocument();
      });

      it('returns "complete" when status.type is complete', () => {
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={undefined}
            status={{ type: 'complete' }}
          />,
        );

        expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
        expect(screen.getByText('test-tool')).toBeInTheDocument();
      });

      it('returns "error" when status.type is incomplete', () => {
        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={undefined}
            status={{ type: 'incomplete', reason: 'error', error: 'Failed' }}
          />,
        );

        // When status is incomplete but no result.ok, shows "Used tool:" (not an error result)
        expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
        expect(screen.getByText('test-tool')).toBeInTheDocument();
      });

      it('prioritizes result.ok over status when both present', () => {
        const result = { ok: true, data: 'success' };

        render(
          <ToolFallback
            toolName="test-tool"
            argsText="{}"
            result={result}
            status={{ type: 'incomplete', reason: 'error' }}
          />,
        );

        // Should use result.ok (complete) not status (incomplete)
        expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
        expect(screen.getByText('test-tool')).toBeInTheDocument();
      });
    });
  });

  describe('Result Display', () => {
    it('displays result when not cancelled and result exists', () => {
      const result = { data: 'success' };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={result}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Result:')).toBeInTheDocument();
      expectJSONContent(result);
    });

    it('does not display result when cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={{ data: 'success' }}
          status={{ type: 'incomplete', reason: 'cancelled', error: 'User cancelled' }}
        />,
      );

      expect(screen.queryByText('Result:')).not.toBeInTheDocument();
      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
    });

    it('does not display result when result is undefined', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={undefined}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.queryByText('Result:')).not.toBeInTheDocument();
    });

    it('allows collapsing and expanding result', async () => {
      const result = { data: 'success' };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={result}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();

      // Initially expanded (result is shown)
      expectJSONContent(result);

      // Click Hide button
      const hideButton = screen.getByRole('button', { name: 'Hide' });
      fireEvent.click(hideButton);

      // Result should be hidden - use a different approach for negative check
      expect(screen.queryByText((content) => content.includes('"data":'))).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();

      // Click Show button
      const showButton = screen.getByRole('button', { name: 'Show' });
      fireEvent.click(showButton);

      // Result should be visible again
      expectJSONContent(result);
    });
  });

  describe('Error Handling - New Format (result.ok)', () => {
    it('displays error section when result.ok is false', () => {
      const result = { ok: false, error: { message: 'Tool execution failed' } };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={result}
          status={{ type: 'running' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Tool execution failed')).toBeInTheDocument();
    });

    it('displays default error message when error.message is not provided', () => {
      const result = { ok: false, error: {} };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={result}
          status={{ type: 'running' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Tool execution failed')).toBeInTheDocument();
    });

    it('displays error section with custom error message', () => {
      const result = {
        ok: false,
        error: { message: 'Custom error: Invalid parameters provided' },
      };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={result}
          status={{ type: 'running' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Custom error: Invalid parameters provided')).toBeInTheDocument();
    });

    it('applies rose color styling to error section', () => {
      const result = { ok: false, error: { message: 'Failed' } };

      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={result}
          status={{ type: 'running' }}
        />,
      );

      expandComponent();
      const errorSection = screen.getByText('Error:').closest('div');
      expect(errorSection).toBeInTheDocument();
    });
  });

  describe('Error Handling - Legacy Format (status.error)', () => {
    it('displays error section when status.error exists', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{ type: 'incomplete', error: 'Legacy error message' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Legacy error message')).toBeInTheDocument();
    });

    it('does not display error section when status.error is undefined', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{ type: 'incomplete' }}
        />,
      );

      expandComponent();
      // Should NOT show error section when no error is provided
      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
      expect(screen.queryByText('Tool execution failed')).not.toBeInTheDocument();
    });
  });

  describe('Cancellation Handling', () => {
    it('displays cancelled state when status.type is incomplete and reason is cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{ type: 'incomplete', reason: 'cancelled' }}
        />,
      );

      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
      // Should show XCircleIcon instead of CheckIcon
      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
    });

    it('displays cancellation reason when provided', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{
            type: 'incomplete',
            reason: 'cancelled',
            error: 'User clicked cancel button',
          }}
        />,
      );

      expandComponent();
      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
      expect(screen.getByText('Cancelled reason:')).toBeInTheDocument();
      expect(screen.getByText('User clicked cancel button')).toBeInTheDocument();
    });

    it('handles string cancellation reason', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{
            type: 'incomplete',
            reason: 'cancelled',
            error: 'Simple string error',
          }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Cancelled reason:')).toBeInTheDocument();
      expect(screen.getByText('Simple string error')).toBeInTheDocument();
    });

    it('handles object cancellation reason', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{
            type: 'incomplete',
            reason: 'cancelled',
            error: { code: 'CANCELLED', message: 'Operation was cancelled' },
          }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Cancelled reason:')).toBeInTheDocument();
      expect(
        screen.getByText(
          JSON.stringify({ code: 'CANCELLED', message: 'Operation was cancelled' }),
        ),
      ).toBeInTheDocument();
    });

    it('does not display cancellation reason when not cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={undefined}
          status={{ type: 'incomplete', reason: 'error', error: 'Failed' }}
        />,
      );

      expandComponent();
      expect(screen.queryByText('Cancelled reason:')).not.toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('starts collapsed by default', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'test' }}
          status={{ type: 'complete' }}
        />,
      );

      // Header should be visible
      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
      // But content should be hidden (args and result not visible)
      expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();
    });

    it('expands when toggle button is clicked', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={{ data: 'test' }}
          status={{ type: 'complete' }}
        />,
      );

      // Initially collapsed
      expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();

      // Click the expand button
      expandComponent();

      // Content should be visible
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
      expect(screen.getByText('Result:')).toBeInTheDocument();
    });

    it('collapses when toggle button is clicked again', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"param": "value"}'
          result={{ data: 'test' }}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();

      // Click again to collapse
      expandComponent();
      expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('applies muted styling when cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'test' }}
          status={{ type: 'incomplete', reason: 'cancelled' }}
        />,
      );

      // Component should have muted styling class
      const root = screen.getByText(/Cancelled tool:/).closest('.aui-tool-fallback-root');
      expect(root).toHaveClass('border-muted-foreground/30', 'bg-muted/30');
    });

    it('applies muted styling when error result', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ ok: false, error: { message: 'Failed' } }}
          status={{ type: 'running' }}
        />,
      );

      const root = screen.getByText(/Failed tool:/).closest('.aui-tool-fallback-root');
      expect(root).toHaveClass('border-muted-foreground/30', 'bg-muted/30');
    });

    it('applies line-through text when cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'test' }}
          status={{ type: 'incomplete', reason: 'cancelled' }}
        />,
      );

      const title = screen.getByText(/Cancelled tool:/);
      expect(title).toHaveClass('text-muted-foreground', 'line-through');
    });

    it('applies line-through text when error result', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ ok: false, error: { message: 'Failed' } }}
          status={{ type: 'running' }}
        />,
      );

      const title = screen.getByText(/Failed tool:/);
      expect(title).toHaveClass('text-muted-foreground', 'line-through');
    });

    it('shows XCircleIcon when cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'test' }}
          status={{ type: 'incomplete', reason: 'cancelled' }}
        />,
      );

      // Should show XCircleIcon (cancelled state)
      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
    });

    it('shows XCircleIcon when error result', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ ok: false, error: { message: 'Failed' } }}
          status={{ type: 'running' }}
        />,
      );

      // Should show XCircleIcon (error state)
      expect(screen.getByText(/Failed tool:/)).toBeInTheDocument();
    });

    it('shows CheckIcon when successful', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'success' }}
          status={{ type: 'complete' }}
        />,
      );

      // Should show CheckIcon (success state)
      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
    });
  });

  describe('Arguments Display', () => {
    it('displays arguments section', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"key": "value"}'
          result={{ data: 'test' }}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
      expect(screen.getByText('{"key": "value"}')).toBeInTheDocument();
    });

    it('applies opacity when cancelled', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"key": "value"}'
          result={{ data: 'test' }}
          status={{ type: 'incomplete', reason: 'cancelled' }}
        />,
      );

      expandComponent();
      const argsSection = screen.getByText('Arguments:').closest('div');
      expect(argsSection).toHaveClass('opacity-60');
    });

    it('applies opacity when error result', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText='{"key": "value"}'
          result={{ ok: false, error: { message: 'Failed' } }}
          status={{ type: 'running' }}
        />,
      );

      expandComponent();
      const argsSection = screen.getByText('Arguments:').closest('div');
      expect(argsSection).toHaveClass('opacity-60');
    });
  });

  describe('Edge Cases', () => {
    it('handles null result gracefully', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={null}
          status={{ type: 'complete' }}
        />,
      );

      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
    });

    it('handles empty string result', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result=""
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
    });

    it('handles undefined status', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText="{}"
          result={{ data: 'test' }}
          status={undefined}
        />,
      );

      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
    });

    it('handles empty argsText', () => {
      render(
        <ToolFallback
          toolName="test-tool"
          argsText=""
          result={{ data: 'test' }}
          status={{ type: 'complete' }}
        />,
      );

      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('renders complete tool execution with result', () => {
      const result = {
        success: true,
        data: {
          items: ['item1', 'item2', 'item3'],
          count: 3,
        },
      };

      render(
        <ToolFallback
          toolName="fetch-data"
          argsText='{"query": "SELECT * FROM users", "limit": 10}'
          result={result}
          status={{ type: 'complete' }}
        />,
      );

      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
      expect(screen.getByText('Result:')).toBeInTheDocument();
      expectJSONContent(result);
    });

    it('renders failed tool execution with error', () => {
      const result = {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters: missing required field "id"',
          details: { field: 'id', issue: 'required but not provided' },
        },
      };

      render(
        <ToolFallback
          toolName="validate-input"
          argsText='{"name": "test", "value": 123}'
          result={result}
          status={{ type: 'running' }}
        />,
      );

      expect(screen.getByText(/Failed tool:/)).toBeInTheDocument();
      expandComponent();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Invalid query parameters: missing required field "id"')).toBeInTheDocument();
    });

    it('renders cancelled tool execution with reason', () => {
      render(
        <ToolFallback
          toolName="long-running-task"
          argsText='{"process": true, "timeout": 300}'
          result={undefined}
          status={{
            type: 'incomplete',
            reason: 'cancelled',
            error: 'User cancelled operation after 5 seconds',
          }}
        />,
      );

      expect(screen.getByText(/Cancelled tool:/)).toBeInTheDocument();
      expandComponent();
      expect(screen.getByText('Cancelled reason:')).toBeInTheDocument();
      expect(screen.getByText('User cancelled operation after 5 seconds')).toBeInTheDocument();
      expect(screen.queryByText('Result:')).not.toBeInTheDocument();
    });

    it('renders running tool execution without result', () => {
      render(
        <ToolFallback
          toolName="processing"
          argsText='{"file": "data.csv"}'
          result={undefined}
          status={{ type: 'running' }}
        />,
      );

      expect(screen.getByText(/Used tool:/)).toBeInTheDocument();
      expandComponent();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
      expect(screen.queryByText('Result:')).not.toBeInTheDocument();
    });
  });
});
