# React Components

Component architecture following atomic design principles and modern React patterns.

## Structure

### Layout Components
Core application layout and navigation components.

- **Layout** (`Layout.tsx`) - Main application layout wrapper with header, sidebar, and content area
- **Header** (`Header.tsx`) - Top navigation bar with app title and global actions
- **Sidebar** (`Sidebar.tsx`) - Navigation sidebar with menu items and session list
- **SidebarNavigation** (`SidebarNavigation.tsx`) - Navigation menu component
- **SessionItem** (`SessionItem.tsx`) - Individual session list item
- **SessionList** (`SessionList.tsx`) - Container for learning session history

### Feature Components
Domain-specific UI components organized by feature area.

#### Analytics (`Analytics/`)
Progress tracking and achievement display components.
- **Achievements** - Achievement badges and milestone display
- **LearningTrends** - Learning progress charts and trends visualization
- **ProgressChart** - Interactive progress charts with time-based metrics
- **SessionTracking** - Session duration and frequency tracking
- **StudyStreak** - Study streak counter and motivation display

#### Chat (`Chat/`)
Conversational interface using assistant-ui library.
- **ChatInterface** - Main chat interface with message history and input
- **SubAgentMessage** - Display for sub-agent responses in multi-agent conversations
- **ToolCard** - Visual representation of tool calls and results

#### Config (`Config/`)
Settings and configuration panels.
- **SettingsPanel** - Main settings interface with tabs for different categories
- **AIProviderSettings** - AI provider selection and configuration
- **AdvancedSettings** - Advanced configuration options
- **ResponseSettings** - Response behavior and model tuning options
- **UISettings** - UI theme and display preferences
- **TestComponent** - Testing utility for settings validation
- **ProviderSelect** - Dropdown for AI provider selection
- **ModelSelect** - Model selection within chosen provider

#### Dashboard (`Dashboard/`)
Overview and quick action components.
- **LearningDashboard** - Main dashboard with overview cards and quick actions
- **KnowledgeMap** - Interactive knowledge graph visualization

#### Discovery (`Discovery/`)
Content exploration and concept parsing components.
- **ContentDiscovery** - Interface for discovering and importing learning content
- **ConceptParsingResults** - Display of parsed concepts from imported content
- **FileSelector** - File and directory selection for content import
- **LocalProjectExplorer** - Explorer for local project files and directories

#### Knowledge (`Knowledge/`)
Knowledge graph visualization and management.
- **KnowledgeGraphVisualization** - Interactive knowledge graph with node/edge rendering
- **KnowledgeMiniGraphPanel** - Compact knowledge graph view for sidebar
- **KnowledgeGameMap** - Gamified knowledge exploration interface
- **ConceptManager** - Interface for managing and editing concepts
- **KnowledgeSearch** - Search interface for finding concepts
- **LoadedConceptsPanel** - Panel showing currently loaded concepts
- **RelationshipManager** - Interface for managing concept relationships

#### Session (`Session/`)
Learning session management components.
- **SessionManager** - Main session management interface with start/stop/pause controls

#### Timeline (`Timeline/`)
Conversation timeline and event visualization.
- **ToolCall** - Display of tool invocations and results in conversation flow

### UI Components
Reusable, atomic UI elements following design system.

- **Button** - Styled button component with variants (primary, secondary, danger)
- **Input** - Form input with validation and error states
- **Card** - Content container with optional header/footer
- **Container** - Layout container with max-width and centering
- **ErrorBoundary** - Error boundary wrapper for graceful error handling
- **ComponentErrorBoundary** - Specialized error boundary for component failures
- **MessageErrorBoundary** - Error boundary for message rendering
- **SettingsErrorBoundary** - Error boundary for settings panels
- **LoadingScreen** - Full-screen loading state display
- **Skeleton** - Loading skeleton for content placeholders
- **ModuleStatusIndicator** - Status indicator for service/module health
- **ConfirmDialog** - Modal confirmation dialog
- **Accordion** - Collapsible content accordion
- **SyntaxHighlighterWrapper** - Code syntax highlighting with copy functionality

## State Management

### Global State (Zustand)
Global application state managed in `src/renderer/stores/`:
- **App Store** - Application-wide state (user preferences, theme)
- **Chat Store** - Chat session state (messages, loading states)
- **Sessions Store** - Learning session management
- **Agents Store** - Agent configuration and status

### Server State (React Query)
Server state management for async data:
- Chat message history
- Learning session data
- Knowledge graph data
- User progress and analytics

### Local State
Component-specific state using React hooks:
- Form state
- Modal visibility
- UI interactions
- Temporary data

## Design System

### Styling
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Custom theme** - Defined in `tailwind.config.js` with design tokens
- **Responsive design** - Mobile-first responsive breakpoints
- **Dark mode** - Built-in dark mode support via CSS variables

### Component Library
- **Headless UI** - Accessible, unstyled UI primitives
- **Heroicons** - SVG icon set
- **Framer Motion** - Animations and micro-interactions
- **React Hot Toast** - Toast notifications

### Chat Interface
- **Assistant UI** - Modern chat interface library (`@assistant-ui/react`)
- **AI SDK** - AI SDK integration (`@assistant-ui/react-ai-sdk`)
- **LangGraph** - Agent visualization (`@assistant-ui/react-langgraph`)

## Component Guidelines

### ✅ DO
- Use functional components with hooks (useState, useEffect, useCallback)
- Define TypeScript interfaces for all props
- Use `useCallback` and `useMemo` for performance optimization
- Keep components focused and single-responsibility
- Use error boundaries for error handling
- Follow the established naming conventions (PascalCase for components)
- Use Tailwind for styling
- Implement proper accessibility attributes

### ❌ DON'T
- Use class components (use functional components only)
- Put business logic in components (use services instead)
- Access electron API directly (use services in `src/renderer/services/`)
- Mix styling approaches (stick to Tailwind)
- Create overly complex components (break into smaller ones)
- Ignore TypeScript strict mode warnings

## Component Patterns

### With Error Boundary
```typescript
export function MyComponent() {
  return (
    <ErrorBoundary>
      <MyComponentContent />
    </ErrorBoundary>
  );
}
```

### With Loading State
```typescript
export function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <div>{/* content */}</div>;
}
```

### With Error State
```typescript
export function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{/* content */}</div>;
}
```

## Testing

Each component includes:
- **Unit tests** - Component rendering and props handling
- **Behavior tests** - User interaction testing with Testing Library
- **Snapshot tests** - Visual regression prevention

Test patterns:
```typescript
describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('value')).toBeInTheDocument();
  });

  it('handles click', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

## Common Imports

```typescript
// Components
import { MyComponent } from '@/renderer/components/MyComponent';

// Services
import { chatService } from '@/renderer/services/chat/chat-service';

// Stores
import { useChatStore } from '@/renderer/stores/chat/chatStore';

// Types
import { ChatMessage } from '@/shared/types/chat';

// Constants
import { API_ENDPOINTS } from '@/shared/constants';
```

## See Also

- [Developer Guide: Components](../../docs/DEVELOPER-GUIDE/architecture.md#components)
- [Testing Guide: Components](../../docs/DEVELOPER-GUIDE/testing.md#components)
- [Design System Guide](../../docs/DEVELOPER-GUIDE/architecture.md#design-system)
- [State Management Guide](../../docs/DEVELOPER-GUIDE/architecture.md#state-management)
