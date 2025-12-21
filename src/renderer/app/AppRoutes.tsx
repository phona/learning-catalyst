import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/renderer/widgets/layout';
import { ChatPage } from '@/renderer/pages/chat';
import { DiscoveryPage } from '@/renderer/pages/discovery';
import { SettingsPage } from '@/renderer/pages/settings';
import { ProgressPage } from '@/renderer/pages/progress';
import { KnowledgePage } from '@/renderer/pages/knowledge';

/**
 * Route definitions for the application.
 *
 * This component defines all application routes and wraps them in the Layout component.
 * Routes are organized by feature area (chat, discovery, progress, etc.).
 *
 * @returns JSX element containing the route configuration
 *
 * @example
 * ```tsx
 * <BrowserRouter>
 *   <AppRoutes />
 * </BrowserRouter>
 * ```
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Main Chat Interface */}
        <Route index element={<ChatPage />} />
        <Route path="chat/:sessionId" element={<ChatPage />} />

        {/* Discovery and Learning */}
        <Route path="discovery" element={<DiscoveryPage />} />

        {/* Progress and Analytics */}
        <Route path="progress" element={<ProgressPage />} />

        {/* Knowledge Management */}
        <Route path="knowledge" element={<KnowledgePage />} />

        {/* Settings and Configuration */}
        <Route path="settings" element={<SettingsPage />} />

        {/* Catch-all route - redirects to main chat */}
        <Route path="*" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}
