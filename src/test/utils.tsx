import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Test wrappers for components that need providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock data generators
export const createMockAIProvider = (name: string) => ({
  name,
  models: {
    chat: [`gpt-4-${name}`, `gpt-3.5-${name}`],
    embedding: [`text-embedding-${name}`]
  },
  api_key: `test-key-${name}`,
  base_url: `https://api.${name}.com/v1`
})

export const createMockChatMessage = (role: 'user' | 'assistant', content: string) => ({
  id: Math.random().toString(36).substring(7),
  role,
  content,
  timestamp: Date.now(),
  metadata: {
    model: 'gpt-4',
    provider: 'openai',
    tokens: Math.floor(Math.random() * 100) + 10
  }
})

export const createMockSession = () => ({
  id: 'test-session-123',
  started_at: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  is_active: true,
  session_data: {
    current_concept: 'python-basics',
    progress: 0.65,
    interaction_count: 12,
    user_id: 'test-user-001'
  },
  checkpoint_data: {
    last_checkpoint: new Date().toISOString(),
    checkpoint_data: {
      completed_concepts: ['variables', 'data-types'],
      current_position: 3
    }
  }
})

export const createMockConfig = () => ({
  ai: {
    default_provider: 'openai',
    default_model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 4096,
    providers: {
      openai: createMockAIProvider('openai'),
      deepseek: createMockAIProvider('deepseek')
    }
  },
  ui: {
    theme: 'dark' as const,
    show_token_usage: true,
    display_format: 'detailed' as const,
    session_duration: 45
  },
  learning: {
    difficulty: 'adaptive' as const,
    pace: 'moderate' as const,
    content_type: ['text', 'visual'],
    auto_save: true,
    session_timeout_minutes: 120
  }
})

// Re-export testing library utilities
export * from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'