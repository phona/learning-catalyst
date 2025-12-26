import { createChatService } from './chat-service';

export { createChatService };
export type ChatService = ReturnType<typeof createChatService>;
