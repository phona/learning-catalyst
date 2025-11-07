/**
 * LangChain Adapter for Concept Parsing
 *
 * Mock implementation for testing purposes
 */

export interface AIProvider {
  name: string;
  provider: string;
  modelId: string;
  weight: number;
  capabilities: string[];
}

/**
 * Mock LangChain Model Factory
 */
export class LangChainModelFactory {
  static createModel(
    providerType: string,
    providerName: string,
    modelId: string,
    providerConfig: AIProvider
  ) {
    // Return a mock model that can be used with LangChain
    return {
      invoke: async (messages: any[]) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          content: `Mock response from ${providerName} ${modelId}`,
          role: 'assistant',
        };
      },
      stream: async function* (messages: any[]) {
        await new Promise(resolve => setTimeout(resolve, 50));
        yield { content: `Mock streaming response from ${providerName} ${modelId}` };
      },
    };
  }
}

/**
 * Mock LangChain Provider Adapter
 */
export class LangChainProviderAdapter {
  static async createModel(
    providerType: string,
    providerName: string,
    modelId: string,
    providerConfig: AIProvider
  ) {
    return LangChainModelFactory.createModel(providerType, providerName, modelId, providerConfig);
  }
}