/**
 * 🎯 Learning Catalyst UI Component Library
 *
 * Centralized design system with consistent, reusable UI components.
 * All components are typed, tested, and follow accessibility best practices.
 *
 * 🏗️ Architecture:
 * - Core primitives (Button, Input, Card, Accordion)
 * - Error handling (ErrorBoundary variants)
 * - Loading states (LoadingScreen, Skeletons)
 * - Layout utilities (Container)
 *
 * 📚️ Usage:
 * ```typescript
 * import { Button, Input, ErrorBoundary } from '@/renderer/components/UI';
 * ```
 */

// ======================
// CORE PRIMITIVE COMPONENTS
// ======================

/**
 * 🎨 Button Component
 *
 * Versatile button with variant, size, loading state, and icon support.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" loading={isLoading}>
 *   Submit Form
 * </Button>
 * ```
 */
export { Button } from './Button';
export type { ButtonProps } from './Button';

/**
 * 📝 Input Component
 *
 * Form input with labels, validation states, icons, and helper text.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email Address"
 *   placeholder="Enter your email"
 *   error="Invalid email format"
 *   leftIcon={<EnvelopeIcon />}
 * />
 * ```
 */
export { Input } from './Input';
export type { InputProps } from './Input';

/**
 * 📇 Card Component System
 *
 * Flexible card components for organizing content.
 *
 * @example
 * ```tsx
 * <Card variant="elevated" padding="lg">
 *   <CardHeader>
 *     <CardTitle>User Profile</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <p>User information goes here</p>
 *   </CardContent>
 * </Card>
 * ```
 */
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps } from './Card';

/**
 * 📎 Accordion Component
 *
 * Expandable/collapsible content sections.
 */
export { Accordion } from './Accordion';
export type { AccordionProps, AccordionItemProps } from './Accordion';

// ======================
// ERROR HANDLING SYSTEM
// ======================

/**
 * 🚨 Error Boundary Components
 *
 * Comprehensive error handling system with context-specific recovery options.
 *
 * Error Types:
 * - **full**: Full-screen error for critical failures
 * - **inline**: Section-level error for non-critical issues
 * - **minimal**: Small inline errors for individual components
 *
 * @example
 * ```tsx
 * <ErrorBoundary variant="inline" title="Chat Error">
 *   <ChatComponent />
 * </ErrorBoundary>
 * ```
 */
export { ErrorBoundary } from './ErrorBoundary';

/**
 * 💬 Chat-specific error boundary with message recovery options
 */

/**
 * 🧩 Generic component error boundary for non-critical components
 */
export { ComponentErrorBoundary } from './ComponentErrorBoundary';

/**
 * ⚙️ Settings-specific error boundary with configuration recovery
 */
export { SettingsErrorBoundary } from './SettingsErrorBoundary';

// ======================
// LOADING STATE SYSTEM
// ======================

/**
 * ⏳️ Application Loading Screen
 *
 * Full-screen loading with state-based messaging and progress indicators.
 *
 * @example
 * ```tsx
 * <LoadingScreen
 *   state="services"
 *   message="Initializing AI services..."
 *   showProgress={true}
 *   progress={75}
 * />
 * ```
 */
export { LoadingScreen } from './LoadingScreen';

/**
 * 📊 Module Status Indicator
 *
 * Visual status indicators for system modules and services.
 */
export { ModuleStatusIndicator } from './ModuleStatusIndicator';

/**
 * 🦴️ Skeleton Loading System
 *
 * Content-aware loading states that match final UI structure.
 *
 * @example
 * ```tsx
 * <MessageSkeleton isUser={false} />
 * <ChatListSkeleton count={5} />
 * <SettingsSkeleton />
 * ```
 */
export { Skeleton, MessageSkeleton, ChatListSkeleton, SettingsSkeleton } from './Skeleton';

// ======================
// LAYOUT UTILITIES
// ======================

/**
 * 📦 Container Component
 *
 * Responsive layout container with max-width controls.
 *
 * @example
 * ```tsx
 * <Container maxWidth="lg" className="p-6">
 *   <Content />
 * </Container>
 * ```
 */
export { Container } from './Container';
