export type MemoryCategory =
  | 'PERSONAL'
  | 'PREFERENCE'
  | 'CONTEXT'
  | 'KNOWLEDGE'
  | 'RELATIONSHIP';

export interface MemoryFact {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  source?: string;
  lastReferencedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryEmbeddingRecord {
  id: string;
  userId: string;
  content: string;
  embedding: Float32Array;
  dimensions: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ConversationSummaryRecord {
  id: string;
  userId: string;
  platform: string;
  summary: string;
  messageCount: number;
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
}

export interface ShortTermMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SimilarityResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface ExtractedFact {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
}

export interface MemoryContext {
  shortTermMessages: ShortTermMessage[];
  relevantFacts: MemoryFact[];
  semanticResults: SimilarityResult[];
  conversationSummary?: string;
}

export interface IShortTermMemory {
  addMessage(userId: string, message: ShortTermMessage): Promise<void>;
  getMessages(userId: string, limit?: number): Promise<ShortTermMessage[]>;
  clear(userId: string): Promise<void>;
}

export interface ILongTermMemory {
  storeFact(userId: string, fact: ExtractedFact, source?: string): Promise<MemoryFact>;
  getFacts(userId: string, category?: MemoryCategory): Promise<MemoryFact[]>;
  getFact(userId: string, category: MemoryCategory, key: string): Promise<MemoryFact | null>;
  deleteFact(userId: string, category: MemoryCategory, key: string): Promise<void>;
  cleanExpired(): Promise<number>;
}

export interface ISemanticMemory {
  store(userId: string, content: string, metadata?: Record<string, unknown>): Promise<void>;
  search(userId: string, query: string, topK?: number): Promise<SimilarityResult[]>;
  clear(userId: string): Promise<void>;
}

export interface IMemoryExtractor {
  extract(message: string): Promise<ExtractedFact[]>;
}

export interface IContextBuilder {
  build(userId: string, currentMessage: string): Promise<string>;
}

export interface IMemoryManager {
  beforeAI(userId: string, message: string): Promise<string>;
  afterAI(userId: string, userMessage: string, assistantMessage: string): Promise<void>;
  clearAll(userId: string): Promise<void>;
}
