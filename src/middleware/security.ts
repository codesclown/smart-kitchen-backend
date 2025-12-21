import { FastifyRequest, FastifyReply } from 'fastify';
import { Context } from '../graphql/context';

// IP-based rate limiting store (in production, use Redis)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

// Suspicious activity tracking
const suspiciousIPs = new Set<string>();
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export interface SecurityConfig {
  maxRequestsPerIP: number;
  maxRequestsPerUser: number;
  windowMs: number;
  maxFailedLogins: number;
  lockoutDurationMs: number;
  suspiciousActivityThreshold: number;
}

const defaultConfig: SecurityConfig = {
  maxRequestsPerIP: process.env.NODE_ENV === 'production' ? 100 : 1000,
  maxRequestsPerUser: process.env.NODE_ENV === 'production' ? 200 : 2000,
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxFailedLogins: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  suspiciousActivityThreshold: 50, // requests per minute
};

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Clean up expired entries
  private cleanup() {
    const now = Date.now();
    
    // Clean IP rate limits
    for (const [ip, data] of ipRequestCounts.entries()) {
      if (now > data.resetTime) {
        ipRequestCounts.delete(ip);
      }
    }
    
    // Clean user rate limits
    for (const [userId, data] of userRequestCounts.entries()) {
      if (now > data.resetTime) {
        userRequestCounts.delete(userId);
      }
    }
    
    // Clean failed login attempts
    for (const [ip, data] of failedLoginAttempts.entries()) {
      if (now - data.lastAttempt > this.config.lockoutDurationMs) {
        failedLoginAttempts.delete(ip);
      }
    }
  }

  // Check if IP is rate limited
  checkIPRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    this.cleanup();
    
    const now = Date.now();
    const ipData = ipRequestCounts.get(ip);
    
    if (!ipData) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }
    
    if (now > ipData.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }
    
    if (ipData.count >= this.config.maxRequestsPerIP) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((ipData.resetTime - now) / 1000) 
      };
    }
    
    ipData.count++;
    return { allowed: true };
  }

  // Check if user is rate limited
  checkUserRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    this.cleanup();
    
    const now = Date.now();
    const userData = userRequestCounts.get(userId);
    
    if (!userData) {
      userRequestCounts.set(userId, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }
    
    if (now > userData.resetTime) {
      userRequestCounts.set(userId, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }
    
    if (userData.count >= this.config.maxRequestsPerUser) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((userData.resetTime - now) / 1000) 
      };
    }
    
    userData.count++;
    return { allowed: true };
  }

  // Check for suspicious activity
  checkSuspiciousActivity(ip: string): boolean {
    if (suspiciousIPs.has(ip)) {
      return false;
    }
    
    const ipData = ipRequestCounts.get(ip);
    if (ipData && ipData.count > this.config.suspiciousActivityThreshold) {
      suspiciousIPs.add(ip);
      console.warn(`Suspicious activity detected from IP: ${ip}`);
      
      // Remove from suspicious list after some time
      setTimeout(() => {
        suspiciousIPs.delete(ip);
      }, this.config.lockoutDurationMs);
      
      return false;
    }
    
    return true;
  }

  // Track failed login attempts
  trackFailedLogin(ip: string): boolean {
    const now = Date.now();
    const attempts = failedLoginAttempts.get(ip);
    
    if (!attempts) {
      failedLoginAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if lockout period has passed
    if (now - attempts.lastAttempt > this.config.lockoutDurationMs) {
      failedLoginAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    if (attempts.count >= this.config.maxFailedLogins) {
      console.warn(`IP ${ip} locked out due to ${attempts.count} failed login attempts`);
      return false;
    }
    
    return true;
  }

  // Clear failed login attempts on successful login
  clearFailedLogins(ip: string): void {
    failedLoginAttempts.delete(ip);
  }

  // Check if IP is locked out
  isLockedOut(ip: string): boolean {
    const attempts = failedLoginAttempts.get(ip);
    if (!attempts) return false;
    
    const now = Date.now();
    if (now - attempts.lastAttempt > this.config.lockoutDurationMs) {
      failedLoginAttempts.delete(ip);
      return false;
    }
    
    return attempts.count >= this.config.maxFailedLogins;
  }

  // Validate request headers for security
  validateHeaders(request: FastifyRequest): { valid: boolean; reason?: string } {
    // Check for required headers in production
    if (process.env.NODE_ENV === 'production') {
      const userAgent = request.headers['user-agent'];
      if (!userAgent || userAgent.length < 10) {
        return { valid: false, reason: 'Invalid or missing User-Agent' };
      }
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-cluster-client-ip',
    ];
    
    for (const header of suspiciousHeaders) {
      const value = request.headers[header];
      if (value && typeof value === 'string') {
        // Basic validation for IP addresses
        const ips = value.split(',').map(ip => ip.trim());
        for (const ip of ips) {
          if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) && 
              !/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip)) {
            return { valid: false, reason: `Invalid IP in ${header}` };
          }
        }
      }
    }
    
    return { valid: true };
  }

  // Get client IP address
  getClientIP(request: FastifyRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers['x-real-ip'];
    if (realIP && typeof realIP === 'string') {
      return realIP;
    }
    
    const clusterIP = request.headers['x-cluster-client-ip'];
    if (clusterIP && typeof clusterIP === 'string') {
      return clusterIP;
    }
    
    return request.ip;
  }

  // Main security check middleware
  async checkSecurity(
    request: FastifyRequest, 
    reply: FastifyReply,
    context?: Context
  ): Promise<{ allowed: boolean; error?: any }> {
    const ip = this.getClientIP(request);
    
    // Validate headers
    const headerValidation = this.validateHeaders(request);
    if (!headerValidation.valid) {
      console.warn(`Invalid headers from IP ${ip}: ${headerValidation.reason}`);
      return {
        allowed: false,
        error: {
          code: 400,
          message: 'Invalid request headers',
        },
      };
    }
    
    // Check if IP is locked out
    if (this.isLockedOut(ip)) {
      return {
        allowed: false,
        error: {
          code: 429,
          message: 'IP temporarily locked due to suspicious activity',
          retryAfter: Math.ceil(this.config.lockoutDurationMs / 1000),
        },
      };
    }
    
    // Check for suspicious activity
    if (!this.checkSuspiciousActivity(ip)) {
      return {
        allowed: false,
        error: {
          code: 429,
          message: 'Suspicious activity detected',
        },
      };
    }
    
    // Check IP rate limit
    const ipLimit = this.checkIPRateLimit(ip);
    if (!ipLimit.allowed) {
      return {
        allowed: false,
        error: {
          code: 429,
          message: 'Rate limit exceeded for IP',
          retryAfter: ipLimit.retryAfter,
        },
      };
    }
    
    // Check user rate limit if authenticated
    if (context?.user) {
      const userLimit = this.checkUserRateLimit(context.user.id);
      if (!userLimit.allowed) {
        return {
          allowed: false,
          error: {
            code: 429,
            message: 'Rate limit exceeded for user',
            retryAfter: userLimit.retryAfter,
          },
        };
      }
    }
    
    return { allowed: true };
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Helper function for GraphQL resolvers
export const checkGraphQLSecurity = async (
  context: Context
): Promise<void> => {
  const result = await securityMiddleware.checkSecurity(
    context.request,
    context.reply,
    context
  );
  
  if (!result.allowed) {
    const error = new Error(result.error.message);
    (error as any).extensions = {
      code: result.error.code === 429 ? 'RATE_LIMIT_EXCEEDED' : 'SECURITY_ERROR',
      statusCode: result.error.code,
      retryAfter: result.error.retryAfter,
    };
    throw error;
  }
};