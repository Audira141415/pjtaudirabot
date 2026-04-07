export type Platform = 'whatsapp' | 'telegram';
export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'throttled';

export interface User {
  id: string;
  platform: Platform;
  platformUserId: string;
  phoneNumber?: string;
  username?: string;
  displayName: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  botPlatform: Platform;
  sessionToken: string;
  metadata: Record<string, any>;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  handler: string;
  requiredRole: UserRole;
  rateLimitConfig: RateLimitConfig;
  isEnabled: boolean;
  aiPowered: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

export interface CommandContext {
  user: User;
  session: Session;
  command: Command;
  input: string;
  platform: Platform;
  messageId?: string;
  groupId?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ExecutionContext {
  commandId: string;
  userId: string;
  sessionId: string;
  input: string;
  platform: Platform;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, metadata);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(remainingTime: number) {
    super(
      `Rate limit exceeded. Please try again in ${remainingTime}s`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { remainingTime }
    );
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(
      `${resource} with id ${id} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}
