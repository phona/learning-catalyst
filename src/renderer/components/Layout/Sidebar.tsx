import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  AcademicCapIcon,
  PlusIcon,
  FolderOpenIcon,
  ClockIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/useAppStore';

interface SidebarProps {
  open: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentView } = useAppStore();

  const navigationItems = [
    {
      id: 'chat',
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      path: '/',
      description: 'Start a conversation',
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: DocumentTextIcon,
      path: '/sessions',
      description: 'View past conversations',
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: ChartBarIcon,
      path: '/progress',
      description: 'Track your learning',
    },
    {
      id: 'knowledge-map',
      label: 'Knowledge Map',
      icon: AcademicCapIcon,
      path: '/knowledge-map',
      description: 'Explore concepts',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog6ToothIcon,
      path: '/settings',
      description: 'Configure the app',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const handleNavigation = (itemId: string, path: string) => {
    setCurrentView(itemId as any);
    navigate(path);
  };

  if (!open) {
    return null;
  }

  return (
    <aside className="sidebar w-64">
      <div className="flex flex-col h-full">
        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <button
              onClick={() => {
                // TODO: Create new chat session
                console.log('New chat');
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="font-medium">New Chat</span>
            </button>

            <button
              onClick={() => {
                // TODO: Open existing session
                console.log('Open session');
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <FolderOpenIcon className="w-4 h-4" />
              <span className="font-medium">Open Session</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.path)}
                  className={`sidebar-item w-full ${active ? 'active' : ''}`}
                  title={item.description}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Recent Sessions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Recent Sessions
            </h3>
          </div>
          <div className="space-y-1">
            {[
              { title: 'Python Basics', time: '2 hours ago', starred: true },
              { title: 'React Hooks', time: '1 day ago', starred: false },
              { title: 'Machine Learning', time: '3 days ago', starred: true },
            ].map((session, index) => (
              <button
                key={index}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                {session.starred ? (
                  <StarIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                ) : (
                  <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.time}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              onClick={() => {
                // TODO: Clear recent sessions
                console.log('Clear recent sessions');
              }}
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear Recent</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};