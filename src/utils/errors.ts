import { GraphQLError } from 'graphql';

export enum ErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  
  // Resource Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage?: string;
  field?: string;
  statusCode?: number;
}

export class AppError extends GraphQLError {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly field?: string;
  public readonly statusCode: number;

  constructor(details: ErrorDetails) {
    super(details.message, {
      extensions: {
        code: details.code,
        userMessage: details.userMessage || details.message,
        field: details.field,
        statusCode: details.statusCode || 400,
      },
    });

    this.code = details.code;
    this.userMessage = details.userMessage || details.message;
    this.field = details.field;
    this.statusCode = details.statusCode || 400;
  }
}

// Predefined error creators
export const AuthErrors = {
  invalidCredentials: () => new AppError({
    code: ErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect. Please try again.',
    statusCode: 401,
  }),

  userAlreadyExists: (email?: string) => new AppError({
    code: ErrorCode.USER_ALREADY_EXISTS,
    message: `User with email ${email} already exists`,
    userMessage: 'An account with this email address already exists. Please use a different email or try signing in.',
    field: 'email',
    statusCode: 409,
  }),

  invalidToken: () => new AppError({
    code: ErrorCode.INVALID_TOKEN,
    message: 'Invalid or malformed token',
    userMessage: 'Your session is invalid. Please sign in again.',
    statusCode: 401,
  }),

  tokenExpired: () => new AppError({
    code: ErrorCode.TOKEN_EXPIRED,
    message: 'Token has expired',
    userMessage: 'Your session has expired. Please sign in again.',
    statusCode: 401,
  }),

  unauthorized: () => new AppError({
    code: ErrorCode.UNAUTHORIZED,
    message: 'Authentication required',
    userMessage: 'You must be signed in to access this resource.',
    statusCode: 401,
  }),
};

export const ValidationErrors = {
  passwordTooShort: (minLength: number = 6) => new AppError({
    code: ErrorCode.PASSWORD_TOO_SHORT,
    message: `Password must be at least ${minLength} characters long`,
    userMessage: `Your password must be at least ${minLength} characters long. Please choose a stronger password.`,
    field: 'password',
    statusCode: 400,
  }),

  invalidEmail: () => new AppError({
    code: ErrorCode.INVALID_EMAIL,
    message: 'Invalid email format',
    userMessage: 'Please enter a valid email address.',
    field: 'email',
    statusCode: 400,
  }),

  invalidInput: (field: string, message: string) => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: `Invalid ${field}: ${message}`,
    userMessage: message,
    field,
    statusCode: 400,
  }),
};

export const ResourceErrors = {
  userNotFound: () => new AppError({
    code: ErrorCode.USER_NOT_FOUND,
    message: 'User not found',
    userMessage: 'The requested user could not be found.',
    statusCode: 404,
  }),

  resourceNotFound: (resource: string) => new AppError({
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: `${resource} not found`,
    userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
    statusCode: 404,
  }),

  permissionDenied: (action?: string) => new AppError({
    code: ErrorCode.PERMISSION_DENIED,
    message: `Permission denied${action ? ` for ${action}` : ''}`,
    userMessage: 'You do not have permission to perform this action.',
    statusCode: 403,
  }),
};

export const ServerErrors = {
  internalError: (message?: string) => new AppError({
    code: ErrorCode.INTERNAL_ERROR,
    message: message || 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again later.',
    statusCode: 500,
  }),

  databaseError: (operation?: string) => new AppError({
    code: ErrorCode.DATABASE_ERROR,
    message: `Database error${operation ? ` during ${operation}` : ''}`,
    userMessage: 'We are experiencing technical difficulties. Please try again later.',
    statusCode: 500,
  }),

  externalServiceError: (service: string) => new AppError({
    code: ErrorCode.EXTERNAL_SERVICE_ERROR,
    message: `External service error: ${service}`,
    userMessage: 'One of our services is temporarily unavailable. Please try again later.',
    statusCode: 503,
  }),
};

// Helper function to handle Prisma errors
export function handlePrismaError(error: any): AppError {
  if (error.code === 'P2002') {
    // Unique constraint violation
    const field = error.meta?.target?.[0] || 'field';
    if (field === 'email') {
      return AuthErrors.userAlreadyExists();
    }
    return ValidationErrors.invalidInput(field, `This ${field} is already in use.`);
  }

  if (error.code === 'P2025') {
    // Record not found
    return ResourceErrors.resourceNotFound('record');
  }

  // Default to database error
  return ServerErrors.databaseError();
}

// Helper function to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate password strength
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters long' };
  }

  return { isValid: true };
}