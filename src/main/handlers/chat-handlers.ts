import { ipcMain, MessageChannelMain } from 'electron';
import type { ChatService } from '@/main/services/domain/chat/chat-service';
import type { PracticeService, PracticePlan } from '@/main/services/domain/practice/practice-service';
import { ILogger } from '../services/types';
import type {
  AgentDisplay,
  ConversationDisplay,
  ConversationHistory,
  MessageDisplay,
  NaturalPracticeSuggestion,
  PracticeOpportunity,
  PracticeOpportunityResult,
  UserLearningContext
} from '@/shared/types/electron-api/chat-api';

const buildAgentDisplay = (agentType: string, status: ConversationDisplay['status']): AgentDisplay => ({
  id: agentType,
  type: agentType as AgentDisplay['type'],
  name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Guide`,
  avatar: '🤖',
  color: '#1e3a8a',
  description: `Assists with ${agentType} topics`,
  capabilities: ['context-aware responses', 'progress tracking'],
  isAvailable: status === 'active',
  category: 'learning',
  stats: {
    sessionsCount: 120,
    avgRating: 4.8
  }
});

const toMessageDisplay = (message: {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}): MessageDisplay => ({
  id: message.id,
  conversationId: message.conversationId,
  role: message.role === 'tool' ? 'assistant' : message.role as 'user' | 'assistant' | 'system',
  content: message.content,
  status: message.role === 'assistant' ? 'completed' : 'sent',
  timestamp: message.timestamp,
  relativeTime: 'just now',
  metadata: message.metadata,
  attachments: (message.metadata?.attachments as MessageDisplay['attachments']) ?? []
});

const toConversationDisplay = (conversation: Awaited<ReturnType<ChatService['getConversation']>>): ConversationDisplay => {
  const messages = conversation?.messages.map(toMessageDisplay) ?? [];
  return {
    id: conversation?.id ?? 'unknown',
    agent: buildAgentDisplay(conversation?.agentType ?? 'learning', (conversation?.status === 'closed' ? 'ended' : conversation?.status) ?? 'active'),
    status: (conversation?.status as ConversationDisplay['status']) ?? 'active',
    createdAt: conversation?.createdAt ?? new Date().toISOString(),
    updatedAt: conversation?.updatedAt ?? new Date().toISOString(),
    messages,
    suggestedTopics: [conversation?.topic ?? 'General'],
    metadata: {
      totalMessages: messages.length,
      duration: '0m',
      lastActivity: 'just now'
    }
  };
};

const buildHistory = (conversation: Awaited<ReturnType<ChatService['getConversation']>>): ConversationHistory => ({
  conversationId: conversation?.id ?? 'unknown',
  messages: conversation?.messages.map(toMessageDisplay) ?? [],
  pagination: {
    hasMore: false,
    total: conversation?.messages.length ?? 0
  },
  summary: {
    totalMessages: conversation?.messages.length ?? 0,
    timeSpan: 'current session',
    keyTopics: [conversation?.topic ?? 'General']
  }
});

const detectPracticeOpportunity = (content: string): PracticeOpportunityResult => {
  const normalized = content.trim().toLowerCase();
  const hasPracticeCue = /practice|review|exercise|drill/.test(normalized);
  const hasQuestion = normalized.includes('?');
  const confidence = Math.min(0.95, normalized.length / 200 + (hasPracticeCue ? 0.25 : 0.1));
  const concept = normalized.split(' ').slice(0, 3).join(' ') || 'this topic';
  const opportunity: PracticeOpportunity = {
    id: `practice-${Date.now()}`,
    type: hasPracticeCue ? 'practicing' : hasQuestion ? 'understanding' : 'confused',
    confidence,
    timing: hasPracticeCue ? 'immediate' : 'soon',
    concept,
    reasoning: hasPracticeCue ? 'User explicitly asked to practice' : 'Conversation hints at a learning moment',
    detectedFrom: [hasPracticeCue ? 'keyword-match' : 'question-detection'],
    practiceReadiness: Math.min(1, confidence),
    suggestedTopics: [concept],
    naturalPrompt: `Let me help you practice ${concept}`,
    estimatedTime: 15,
    difficulty: 'medium'
  };

  return {
    hasOpportunity: hasPracticeCue || hasQuestion,
    opportunity: hasPracticeCue || hasQuestion ? opportunity : undefined,
    shouldSuggest: hasPracticeCue || hasQuestion,
    reason: hasPracticeCue ? 'Practice intent detected' : 'Curiosity detected via questions',
    timing: hasPracticeCue ? 'immediate' : 'wait',
    confidence: hasPracticeCue ? Math.min(1, confidence + 0.1) : confidence
  };
};

const buildPracticeSuggestion = (
  plan: PracticePlan,
  opportunity?: PracticeOpportunity,
  userContext?: UserLearningContext
): NaturalPracticeSuggestion => {
  const focusConcept = plan.focusConcepts[0] ?? opportunity?.concept ?? 'this topic';
  const baseChallenge = plan.exercises.map((exercise) => exercise.title).join(' • ');
  const vibe = (opportunity?.type ?? 'practicing') as NaturalPracticeSuggestion['vibe'];
  const feedbackStyle = userContext?.preferences.feedbackStyle ?? 'encouraging';
  let suggestionType: NaturalPracticeSuggestion['type'] = 'gentle-nudge';
  let introduction = `It looks like ${focusConcept} is top of mind—ready for a quick practice?`;
  if (feedbackStyle === 'direct') {
    suggestionType = 'challenge';
    introduction = `Let's directly tackle ${focusConcept} with a focused challenge.`;
  } else if (feedbackStyle === 'gentle') {
    suggestionType = 'collaborative-invite';
    introduction = `Would you like to explore ${focusConcept} together?`;
  }
  const options = {
    accept: feedbackStyle === 'direct' ? 'I’m ready, let’s do this' : 'Yes, let’s do it',
    decline: 'Maybe later',
    postpone: 'Remind me in a bit'
  };

  return {
    id: `suggestion-${Date.now()}`,
    type: suggestionType,
    introduction,
    challenge: baseChallenge || plan.summary,
    context: plan.summary,
    estimatedTime: plan.exercises.length * 5 || 15,
    difficulty: plan.exercises[0]?.difficulty ?? 'medium',
    vibe,
    timing: {
      when: opportunity?.timing === 'immediate' ? 'right now' : 'soon',
      urgency: opportunity?.timing === 'immediate' ? 'high' : 'medium'
    },
    options,
    metadata: {
      concept: focusConcept,
      relatedTopics: plan.focusConcepts,
      prerequisites: [focusConcept],
      nextSteps: plan.suggestions
    }
  };
};

interface ChatHandlersDeps {
  chatService: ChatService;
  practiceService: PracticeService;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
}

export const setupChatHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: ChatHandlersDeps
) => {
  const handlerLogger = services.loggerService.child({ handler: 'chat' });

  ipcMainInstance.handle('chat:start-conversation', async (_event, params) => {
    handlerLogger.info('Starting new conversation', { agentType: params.agentType, topic: params.topic });
    const conversation = await services.chatService.createConversation({
      title: params.topic ?? 'New conversation',
      agentType: params.agentType,
      topic: params.topic,
      preferences: params.preferences
    });
    return toConversationDisplay(conversation);
  });

  ipcMainInstance.handle('chat:send-message', async (_event, params) => {
    handlerLogger.info('Sending chat message', { conversationId: params.conversationId });
    const result = await services.chatService.sendMessage({
      conversationId: params.conversationId,
      role: 'user',
      content: params.message,
      attachments: params.attachments
    });
    return {
      userMessage: toMessageDisplay(result.userMessage),
      assistantMessage: result.assistantMessage ? toMessageDisplay(result.assistantMessage) : undefined
    };
  });

  ipcMainInstance.on('chat:start-stream', async (event, params) => {
    handlerLogger.info('Starting chat stream', { conversationId: params.conversationId });
    const channel = new MessageChannelMain();
    event.sender.postMessage('chat:stream-ready', null, [channel.port1]);
    channel.port2.start();
    try {
      const { stream } = await services.chatService.streamAssistantResponse({
        conversationId: params.conversationId,
        content: params.message,
        attachments: params.attachments
      });
      for await (const chunk of stream) {
        channel.port2.postMessage({ type: 'chat:chunk', chunk });
      }
      channel.port2.postMessage({ type: 'chat:complete' });
    } catch (error) {
      handlerLogger.error('Chat stream failed', error);
      channel.port2.postMessage({
        type: 'chat:error',
        error: error instanceof Error ? error.message : 'Unknown streaming error'
      });
    } finally {
      channel.port2.close();
    }
  });

  ipcMainInstance.handle('chat:get-typing-indicator', async (_event, conversationId) => {
    handlerLogger.info('Fetching typing indicator', { conversationId });
    return services.chatService.getTypingIndicator(conversationId);
  });

  ipcMainInstance.handle('chat:get-history', async (_event, params) => {
    handlerLogger.info('Fetching conversation history', { conversationId: params.conversationId });
    const conversation = await services.chatService.getConversation(params.conversationId);
    return buildHistory(conversation);
  });

  ipcMainInstance.handle('chat:pause-conversation', async (_event, conversationId) => {
    handlerLogger.info('Pausing conversation', { conversationId });
    await services.chatService.pauseConversation(conversationId);
    return { success: true, message: 'Conversation paused' };
  });

  ipcMainInstance.handle('chat:resume-conversation', async (_event, conversationId) => {
    handlerLogger.info('Resuming conversation', { conversationId });
    await services.chatService.resumeConversation(conversationId);
    return { success: true, context: {} };
  });

  ipcMainInstance.handle('chat:end-conversation', async (_event, conversationId) => {
    handlerLogger.info('Ending conversation', { conversationId });
    await services.chatService.endConversation(conversationId);
    return {
      conversationId,
      summary: 'Conversation ended successfully',
      keyTopics: [],
      duration: '0m',
      messageCount: 0,
      suggestedFollowUps: []
    };
  });

  ipcMainInstance.handle('chat:checkPracticeOpportunity', async (_event, params) => {
    handlerLogger.info('Checking practice opportunity', { conversationId: params.conversationId });
    return detectPracticeOpportunity(params.userMessage);
  });

  ipcMainInstance.handle('chat:getPracticeSuggestion', async (_event, params) => {
    handlerLogger.info('Generating practice suggestion', { opportunityId: params.opportunity?.id });
    if (!params.opportunity) {
      throw new Error('Practice opportunity required before requesting a suggestion');
    }
    const plan = await services.practiceService.generatePracticePlan({
      topic: params.opportunity.concept,
      content: params.opportunity.reasoning,
      difficulty: params.opportunity.difficulty ?? 'medium',
      count: params.userContext?.preferences.practiceFrequency === 'high' ? 5 : 3,
      userId: params.userContext?.id
    });
    return buildPracticeSuggestion(plan, params.opportunity, params.userContext);
  });
};
