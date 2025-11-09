import React, { createContext, useContext } from 'react';
import { ICatalystService } from '../services/interfaces/ICatalystService.js';
import { ChatService } from '../services/ChatService.js';
import { IAnalyticsService } from '../services/interfaces/IAnalyticsService.js';
import { rendererServiceContainer, RENDERER_SERVICE_NAMES } from '../services/ServiceContainer.js';

const ServiceContext = createContext<{
  catalystService: ICatalystService;
  chatService: ChatService;
  analyticsService: IAnalyticsService;
} | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const catalystService = rendererServiceContainer.get<ICatalystService>(RENDERER_SERVICE_NAMES.CATALYST_SERVICE);
  const chatService = rendererServiceContainer.get<ChatService>(RENDERER_SERVICE_NAMES.CHAT_SERVICE);
  const analyticsService = rendererServiceContainer.get<IAnalyticsService>(RENDERER_SERVICE_NAMES.ANALYTICS_SERVICE);
  return (
    <ServiceContext.Provider value={{ catalystService, chatService, analyticsService }}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useCatalystService = (): ICatalystService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useCatalystService must be used within ServiceProvider');
  }
  return context.catalystService;
};

export const useChatService = (): ChatService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useChatService must be used within ServiceProvider');
  }
  return context.chatService;
};

export const useAnalyticsService = (): IAnalyticsService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useAnalyticsService must be used within ServiceProvider');
  }
  return context.analyticsService;
};