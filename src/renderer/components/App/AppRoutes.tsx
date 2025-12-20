import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/renderer/components/Layout';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';
import { DiscoveryPage } from '@/renderer/components/Discovery';
import { SettingsPanel } from '@/renderer/components/Config/SettingsPanel';
import { LearningDashboard } from '@/renderer/components/Dashboard/LearningDashboard';
import { KnowledgeMap } from '@/renderer/components/Dashboard/KnowledgeMap';

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
        <Route index element={<ChatInterface />} />
        <Route path="chat/:sessionId" element={<ChatInterface />} />

        {/* Discovery and Learning */}
        <Route path="discovery" element={<DiscoveryPage />} />

        {/* Progress and Analytics */}
        <Route path="progress" element={<LearningDashboard />} />

        {/* Knowledge Management */}
        <Route path="knowledge" element={<KnowledgeMap />} />

        {/* Settings and Configuration */}
        <Route path="settings" element={<SettingsPanel />} />

        {/* Catch-all route - redirects to main chat */}
        <Route path="*" element={<ChatInterface />} />
      </Route>
    </Routes>
  );
}
