export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  readonly name: string;
  chat(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
  openai?: {
    apiKey: string;
    model: string;
    temperature: number;
  };
  anthropic?: {
    apiKey: string;
  };
  ollama?: {
    endpoint: string;
  };
}
