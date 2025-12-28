import { forwardRef, useMemo, type FC } from 'react';
import { MessagePrimitive } from '@assistant-ui/react';
import {
  AssistantActionBar,
  AssistantMessage,
  BranchPicker,
  MessagePart,
  useThreadConfig,
} from '@assistant-ui/react-ui';

import { Reasoning, ReasoningGroup } from './Reasoning';

namespace AssistantMessageContentWithReasoning {
  export type Element = HTMLDivElement;
  export type Props = React.ComponentPropsWithoutRef<'div'>;
}

const AssistantMessageContentWithReasoning = forwardRef<
  AssistantMessageContentWithReasoning.Element,
  AssistantMessageContentWithReasoning.Props
>((props, ref) => {
  const { tools, assistantMessage: { components = {} } = {} } = useThreadConfig();

  const toolsComponents = useMemo(
    () => ({
      by_name: !tools
        ? undefined
        : Object.fromEntries(tools.map((t) => [t.unstable_tool.toolName, t.unstable_tool.render])),
      Fallback: components.ToolFallback,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...(tools ?? []), components.ToolFallback],
  );

  const Text = components.Text ?? MessagePart.Text;
  const Empty = components.Empty;
  const Footer = components.Footer;

  return (
    <div className="aui-assistant-message-content flex flex-col" {...props} ref={ref}>
      <MessagePrimitive.Content
        components={{
          Text,
          Empty,
          Reasoning,
          ReasoningGroup,
          tools: toolsComponents,
        }}
      />
      {Footer && <Footer />}
    </div>
  );
});

AssistantMessageContentWithReasoning.displayName = 'AssistantMessageContentWithReasoning';

export const AssistantMessageWithReasoning: FC = () => {
  return (
    <AssistantMessage.Root>
      <AssistantMessage.Avatar />
      <AssistantMessageContentWithReasoning />
      <BranchPicker />
      <AssistantActionBar />
    </AssistantMessage.Root>
  );
};
