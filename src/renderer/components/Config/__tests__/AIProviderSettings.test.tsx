import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIProviderSettings } from '@/renderer/components/Config/AIProviderSettings';
import { createMockConfig } from '@/test/utils/helpers/test-utils';
import { useService } from '@/renderer/hooks/useAppServices';
import { utilityToasts } from '@/renderer/utils/toast';


// Mock the useAppServices hook to provide configService
vi.mock('@/renderer/hooks/useAppServices', () => ({
  useService: vi.fn().mockReturnValue({
    validateProvider: vi.fn().mockResolvedValue({ success: true }),
    getProviderModels: vi.fn().mockResolvedValue(['gpt-3.5-turbo', 'gpt-4']),
    testModel: vi.fn().mockResolvedValue({
      status: 'success',
      details: { response_time: 100 },
    }),
  }),
}));

// Mock the toast utility
vi.mock('@/renderer/utils/toast', () => ({
  utilityToasts: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AIProviderSettings', () => {
  const mockModelTypeConfigs = {
    chat: {
      default_provider: 'openai',
      default_model: 'gpt-3.5-turbo',
      available_providers: ['openai', 'chatglm', 'openai-compatible'],
      api_keys: {
        openai: 'test-openai-key',
        chatglm: 'test-chatglm-key',
      },
      custom_provider_url: undefined,
      settings: {
        temperature: 0.7,
        max_tokens: 4096,
      },
      capabilities: {
        streaming: true,
        thinking: true,
      },
    },
    embedding: {
      default_provider: 'openai',
      default_model: 'text-embedding-ada-002',
      available_providers: ['openai'],
      api_keys: {
        openai: 'test-openai-key',
      },
      custom_provider_url: undefined,
      settings: {},
      capabilities: {},
    },
    rerank: {
      default_provider: 'openai',
      default_model: 'rerank-model',
      available_providers: ['openai'],
      api_keys: {
        openai: 'test-openai-key',
      },
      custom_provider_url: undefined,
      settings: {},
      capabilities: {},
    },
  };

  const defaultProps = {
    modelTypeConfigs: mockModelTypeConfigs,
    onModelTypeConfigChange: vi.fn(),
    remoteModels: {},
    fetchingModels: {},
    fetchErrors: {},
    onFetchModels: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all model types', () => {
    render(<AIProviderSettings {...defaultProps} />);

    expect(screen.getByText('Chat Models')).toBeInTheDocument();
    expect(screen.getByText('Embedding Models')).toBeInTheDocument();
    expect(screen.getByText('Rerank Models')).toBeInTheDocument();
  });

  it('should render model type descriptions', () => {
    render(<AIProviderSettings {...defaultProps} />);

    expect(screen.getByText('Conversational AI models for chat and dialogue')).toBeInTheDocument();
    expect(screen.getByText('Text embedding models for semantic search and similarity')).toBeInTheDocument();
    expect(screen.getByText('Text reranking models for improved search results')).toBeInTheDocument();
  });

  it('should expand chat models by default', () => {
    render(<AIProviderSettings {...defaultProps} />);

    // Chat models should be expanded by default
    expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-3.5-turbo')).toBeInTheDocument();
  });

  it('should toggle model type expansion', async () => {
    const user = userEvent.setup();
    render(<AIProviderSettings {...defaultProps} />);

    // Initially, only chat models should be expanded
    expect(screen.queryByDisplayValue('text-embedding-ada-002')).not.toBeInTheDocument();

    // Click on embedding models to expand
    const embeddingHeader = screen.getByText('Embedding Models');
    await user.click(embeddingHeader);

    expect(screen.getByDisplayValue('text-embedding-ada-002')).toBeInTheDocument();
  });

  it('should handle provider change', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    const providerSelect = screen.getByDisplayValue('openai');
    await user.selectOptions(providerSelect, 'chatglm');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      default_provider: 'chatglm',
      default_model: '',
      custom_provider_url: undefined,
    });
  });

  it('should handle custom provider URL for openai-compatible', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    // Change to openai-compatible provider
    const providerSelect = screen.getByDisplayValue('openai');
    await user.selectOptions(providerSelect, 'openai-compatible');

    // Custom URL input should appear
    const urlInput = screen.getByPlaceholderText('https://api.example.com/v1');
    expect(urlInput).toBeInTheDocument();

    // Enter custom URL
    await user.type(urlInput, 'https://custom.api.com/v1');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      default_provider: 'openai-compatible',
      custom_provider_url: 'https://custom.api.com/v1',
    });
  });

  it('should handle API key input', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    const apiKeyInput = screen.getByPlaceholderText('Enter your API key');
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'new-api-key');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      api_keys: {
        openai: 'new-api-key',
        chatglm: 'test-chatglm-key',
      },
    });
  });

  it('should toggle API key visibility', async () => {
    render(<AIProviderSettings {...defaultProps} />);

    const apiKeyInput = screen.getByPlaceholderText('Enter your API key');
    expect(apiKeyInput).toHaveAttribute('type', 'password');

    const visibilityButton = screen.getByTitle('Show API key');
    await user.click(visibilityButton);

    expect(apiKeyInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByTitle('Hide API key');
    await user.click(hideButton);

    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should handle model selection', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo');
    await user.selectOptions(modelSelect, 'gpt-4');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      default_model: 'gpt-4',
    });
  });

  it('should enable manual model input', async () => {
    render(<AIProviderSettings {...defaultProps} />);

    const manualInputButton = screen.getByTitle('Enter model manually');
    await user.click(manualInputButton);

    const manualInput = screen.getByPlaceholderText('Enter model name manually');
    expect(manualInput).toBeInTheDocument();

    await user.type(manualInput, 'custom-model-name');
    await user.click(screen.getByTitle('Apply model'));

    expect(defaultProps.onModelTypeConfigChange).toHaveBeenCalledWith('chat', {
      default_model: 'custom-model-name',
    });
  });

  it('should fetch models from provider', async () => {
    const mockFetchModels = vi.fn();
    render(
      <AIProviderSettings
        {...defaultProps}
        onFetchModels={mockFetchModels}
      />
    );

    const fetchButton = screen.getByTitle('Fetch latest models from API');
    await user.click(fetchButton);

    expect(mockFetchModels).toHaveBeenCalledWith('chat');
  });

  it('should show fetching status', () => {
    render(
      <AIProviderSettings
        {...defaultProps}
        fetchingModels={{ 'openai-chat': true }}
      />
    );

    expect(screen.getByText('Fetching models from openai...')).toBeInTheDocument();
  });

  it('should show fetch errors', () => {
    render(
      <AIProviderSettings
        {...defaultProps}
        fetchErrors={{ 'openai-chat': 'API key invalid' }}
      />
    );

    expect(screen.getByText('API key invalid')).toBeInTheDocument();
  });

  it('should show model fetch success status', () => {
    render(
      <AIProviderSettings
        {...defaultProps}
        remoteModels={{ 'openai-chat': { chat: [{ model_id: 'model1' }, { model_id: 'model2' }] }}}
        fetchingModels={{ 'openai-chat': false }}
      />
    );

    expect(screen.getByText('2 models from openai API')).toBeInTheDocument();
  });

  it('should test model functionality', async () => {
    const mockTestModel = vi.fn().mockResolvedValue({
      status: 'success',
      details: { response_time: 100 },
    });

    const mockConfigService = { testModel: mockTestModel };
    vi.mocked(useService).mockReturnValue(mockConfigService);

    render(<AIProviderSettings {...defaultProps} />);

    const testButton = screen.getByTitle('Test model');
    await user.click(testButton);

    await waitFor(() => {
      expect(mockTestModel).toHaveBeenCalledWith('openai', 'gpt-3.5-turbo', 'chat');
    });

    expect(utilityToasts.success).toHaveBeenCalledWith('gpt-3.5-turbo test successful');
  });

  it('should show model test errors', async () => {
    const mockTestModel = vi.fn().mockResolvedValue({
      status: 'error',
      details: { error: 'Invalid API key' },
    });

    const mockConfigService = { testModel: mockTestModel };
    vi.mocked(useService).mockReturnValue(mockConfigService);

    render(<AIProviderSettings {...defaultProps} />);

    const testButton = screen.getByTitle('Test model');
    await user.click(testButton);

    await waitFor(() => {
      expect(utilityToasts.error).toHaveBeenCalledWith(
        'gpt-3.5-turbo test failed: Invalid API key'
      );
    });
  });

  it('should display thinking capability badge', () => {
    render(<AIProviderSettings {...defaultProps} />);

    expect(screen.getByText('thinking')).toBeInTheDocument();
  });

  it('should display streaming capability badge', () => {
    render(<AIProviderSettings {...defaultProps} />);

    expect(screen.getByText('streaming')).toBeInTheDocument();
  });

  it('should handle temperature setting for chat models', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    const temperatureInput = screen.getByDisplayValue('0.7');
    await user.clear(temperatureInput);
    await user.type(temperatureInput, '0.5');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      settings: {
        temperature: 0.5,
        max_tokens: 4096,
      },
    });
  });

  it('should handle max tokens setting for chat models', async () => {
    const mockOnChange = vi.fn();
    render(
      <AIProviderSettings {...defaultProps} onModelTypeConfigChange={mockOnChange} />
    );

    const maxTokensInput = screen.getByDisplayValue('4096');
    await user.clear(maxTokensInput);
    await user.type(maxTokensInput, '2048');

    expect(mockOnChange).toHaveBeenCalledWith('chat', {
      settings: {
        temperature: 0.7,
        max_tokens: 2048,
      },
    });
  });

  it('should not show model settings for non-chat models', async () => {
    const user = userEvent.setup();
    render(<AIProviderSettings {...defaultProps} />);

    // Expand embedding models
    const embeddingHeader = screen.getByText('Embedding Models');
    await user.click(embeddingHeader);

    // Should not show temperature and max tokens for embedding models
    expect(screen.queryByDisplayValue('0.7')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('4096')).not.toBeInTheDocument();
  });
});