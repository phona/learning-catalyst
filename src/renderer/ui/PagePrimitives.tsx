/**
 * Page Primitives - Design System Components
 *
 * Provides a consistent, reusable set of page-level components that maintain
 * visual consistency across all application pages while aligning with
 * assistant-ui's design tokens.
 *
 * Design Philosophy:
 * - Use semantic color tokens (background, foreground, border, etc.)
 * - Avoid hardcoded color values to ensure theme consistency
 * - Provide sensible defaults with customization options
 * - Match assistant-ui's aesthetic and spacing patterns
 *
 * Color Token Mapping:
 * - background: Main page background
 * - foreground: Primary text color
 * - card: Card/container background
 * - card-foreground: Text on card backgrounds
 * - border: Container borders and dividers
 * - muted-foreground: Secondary text, captions
 * - accent: Highlighted interactive elements
 * - accent-foreground: Text on accent backgrounds
 */

import React, { ReactNode } from 'react';

// ============================================================================
// PageScaffold - Main page container with standardized header and content
// ============================================================================

interface PageScaffoldProps {
  /** Page title displayed in the header */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Optional action buttons or controls in the header */
  actions?: ReactNode;
  /** Page content */
  children: ReactNode;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * PageScaffold - Standard page container component
 *
 * Provides consistent page structure with:
 * - Fixed header with title, subtitle, and optional actions
 * - Scrollable content area
 * - Proper spacing and visual hierarchy
 * - Theme-aware styling using semantic tokens
 *
 * @example
 * ```tsx
 * <PageScaffold
 *   title="Discovery"
 *   subtitle="Parse concepts from your learning materials"
 *   actions={<Button>Import</Button>}
 * >
 *   <ContentDiscovery />
 * </PageScaffold>
 * ```
 */
export const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`h-full flex flex-col bg-background text-foreground ${className}`}>
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-1.5 text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="h-full p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Section - Card-like container for grouped content
// ============================================================================

interface SectionProps {
  /** Optional section title */
  title?: string;
  /** Section content */
  children: ReactNode;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * Section - Card-like container for grouped content
 *
 * Creates a card-like container that:
 * - Groups related content together
 * - Provides consistent padding and spacing
 * - Supports optional titled header
 * - Uses semantic color tokens for theming
 *
 * @example
 * ```tsx
 * <Section title="Recent Activity">
 *   <ActivityList />
 * </Section>
 * ```
 */
export const Section: React.FC<SectionProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3.5 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-card-foreground">
            {title}
          </h2>
        </div>
      )}
      <div className="p-5 text-card-foreground">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// Toolbar - Standard control row for filters, search, and actions
// ============================================================================

interface ToolbarProps {
  /** Toolbar content (buttons, inputs, filters, etc.) */
  children: ReactNode;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * Toolbar - Standard control row component
 *
 * Provides a standardized layout for:
 * - Search and filter controls
 * - Action buttons
 * - Status indicators
 * - Layout controls
 *
 * Uses subtle background to differentiate from main content.
 *
 * @example
 * ```tsx
 * <Toolbar>
 *   <Input placeholder="Search..." />
 *   <Button variant="outline">Filter</Button>
 *   <div className="ml-auto">
 *     <Button>Add New</Button>
 *   </div>
 * </Toolbar>
 * ```
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border ${className}`}>
      {children}
    </div>
  );
};

// ============================================================================
// EmptyState - Standard empty view for lists and dashboards
// ============================================================================

interface EmptyStateProps {
  /** Main empty state title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button or component */
  action?: ReactNode;
  /** Icon component to display (optional) */
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * EmptyState - Standard empty view component
 *
 * Provides a consistent empty state experience with:
 * - Clear messaging about the empty state
 * - Optional description for context
 * - Optional action to help users proceed
 * - Optional icon for visual appeal
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No sessions yet"
 *   description="Start your first learning session to see progress here"
 *   action={<Button>Create Session</Button>}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon: Icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4">
          <Icon className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ContentGrid - Responsive grid layout for cards and content blocks
// ============================================================================

interface ContentGridProps {
  /** Grid content */
  children: ReactNode;
  /** Number of columns on large screens (default: 3) */
  columns?: number;
  /** Gap between grid items (default: 'lg') */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ContentGrid - Responsive grid layout component
 *
 * Provides a responsive grid layout for:
 * - Card collections
 * - Dashboard widgets
 * - Feature showcases
 * - Multi-column content
 *
 * @example
 * ```tsx
 * <ContentGrid columns={2} gap="lg">
 *   <Section>Widget 1</Section>
 *   <Section>Widget 2</Section>
 *   <Section>Widget 3</Section>
 *   <Section>Widget 4</Section>
 * </ContentGrid>
 * ```
 */
export const ContentGrid: React.FC<ContentGridProps> = ({
  children,
  columns = 3,
  gap = 'lg',
  className = '',
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${columnClasses[columns as keyof typeof columnClasses]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

// ============================================================================
// Spacer - Utility component for consistent spacing
// ============================================================================

interface SpacerProps {
  /** Size of the spacer (default: 'md') */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Spacer - Vertical spacing utility component
 *
 * Provides consistent vertical spacing between elements.
 *
 * @example
 * ```tsx
 * <h1>Title</h1>
 * <Spacer size="lg" />
 * <p>Content</p>
 * ```
 */
export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
}) => {
  const sizeClasses = {
    xs: 'h-2',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
  };

  return <div className={sizeClasses[size]} />;
};
