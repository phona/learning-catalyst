import type {
  MessageStatus,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from '@assistant-ui/react';

type BaseArgs = {
  id: string;
  createdAt?: Date;
};

export const makeThreadUserMessage = ({
  id,
  createdAt = new Date(),
  text,
}: BaseArgs & { text: string }): ThreadMessage => ({
  id,
  createdAt,
  role: 'user',
  content: [{ type: 'text', text } satisfies ThreadUserMessagePart],
  attachments: [],
  metadata: {
    custom: {},
  },
});

export const makeThreadAssistantMessage = ({
  id,
  createdAt = new Date(),
  text,
  status = { type: 'complete', reason: 'stop' },
}: BaseArgs & { text: string; status?: MessageStatus }): ThreadMessage => ({
  id,
  createdAt,
  role: 'assistant',
  content: [{ type: 'text', text } satisfies ThreadAssistantMessagePart],
  status,
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

