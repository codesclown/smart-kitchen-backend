import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context, requireAuth } from '../context';
import { 
  AuthErrors, 
  ValidationErrors, 
  ServerErrors, 
  handlePrismaError, 
  isValidEmail, 
  validatePassword 
} from '../../utils/errors';
import { securityMiddleware, checkGraphQLSecurity } from '../../middleware/security';
import { EmailService } from '../../services/email';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const authResolvers: any = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      return context.prisma.user.findUnique({
        where: { id: user.id },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: any, context: Context) => {
      try {
        const { email, password, name } = input;

        // Validate email format
        if (!isValidEmail(email)) {
          throw ValidationErrors.invalidEmail();
        }

        // Validate password
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Check if user already exists
        const existingUser = await context.prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (existingUser) {
          throw AuthErrors.userAlreadyExists(email);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await context.prisma.user.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name?.trim(),
          },
        });

        // Create default household
        const household = await context.prisma.household.create({
          data: {
            name: `${name?.trim() || email.split('@')[0]}'s Kitchen`,
            description: 'My personal kitchen management',
            createdById: user.id,
          },
        });

        // Add user as owner of the household
        await context.prisma.householdMember.create({
          data: {
            userId: user.id,
            householdId: household.id,
            role: 'OWNER',
          },
        });

        // Create default kitchen
        await context.prisma.kitchen.create({
          data: {
            householdId: household.id,
            name: 'Home Kitchen',
            description: 'Main kitchen',
            type: 'HOME',
          },
        });

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
        );

        // Send welcome email (don't wait for it)
        EmailService.sendWelcomeEmail(user.email, user.name || 'User').catch(error => {
          console.error('Failed to send welcome email:', error);
        });

        return {
          token,
          user,
        };
      } catch (error: any) {
        // Re-throw validation errors (simple Error objects)
        if (error instanceof Error && !('code' in error)) {
          throw error;
        }
        
        // Re-throw custom errors
        if (error.extensions?.code) {
          throw error;
        }
        
        // Handle Prisma errors
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }

        // Handle unexpected errors
        console.error('Registration error:', error);
        throw ServerErrors.internalError('Failed to create user account');
      }
    },

    login: async (_: any, { input }: any, context: Context) => {
      try {
        // Check security first
        await checkGraphQLSecurity(context);
        
        const { email, password } = input;
        const ip = securityMiddleware.getClientIP(context.request);

        // Check if IP is locked out
        if (securityMiddleware.isLockedOut(ip)) {
          throw new Error('Too many failed login attempts. Please try again later.');
        }

        // Validate email format
        if (!isValidEmail(email)) {
          securityMiddleware.trackFailedLogin(ip);
          throw ValidationErrors.invalidEmail();
        }

        // Find user
        const user = await context.prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          securityMiddleware.trackFailedLogin(ip);
          throw AuthErrors.invalidCredentials();
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          securityMiddleware.trackFailedLogin(ip);
          throw AuthErrors.invalidCredentials();
        }

        // Clear failed login attempts on successful login
        securityMiddleware.clearFailedLogins(ip);

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
        );

        return {
          token,
          user,
        };
      } catch (error: any) {
        // Handle Prisma errors
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        
        // Re-throw custom errors
        if (error.extensions?.code) {
          throw error;
        }

        // Handle unexpected errors
        console.error('Login error:', error);
        throw ServerErrors.internalError('Failed to authenticate user');
      }
    },

    logout: async (_: any, __: any, context: Context) => {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token. We could implement token blacklisting
      // here if needed for enhanced security.
      return true;
    },

    forgotPassword: async (_: any, { email }: any, context: Context) => {
      // Find user by email
      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return { success: true, message: 'If the email exists, a reset link has been sent.' };
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions
      );

      // In a real app, you would send an email here
      // For now, we'll just log it (in development) or return success
      if (process.env.NODE_ENV === 'development') {
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
      }

      // Send password reset email
      EmailService.sendPasswordResetEmail(user.email, resetToken).catch(error => {
        console.error('Failed to send password reset email:', error);
      });

      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    },

    resetPassword: async (_: any, { token, newPassword }: any, context: Context) => {
      try {
        // Verify reset token
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (decoded.type !== 'password_reset') {
          throw AuthErrors.invalidToken();
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
          if (newPassword.length < 6) {
            throw ValidationErrors.passwordTooShort();
          } else {
            throw ValidationErrors.invalidInput('password', passwordValidation.message || 'Invalid password');
          }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password
        await context.prisma.user.update({
          where: { id: decoded.userId },
          data: { password: hashedPassword },
        });

        return { success: true, message: 'Password has been reset successfully.' };
      } catch (error: any) {
        if (error instanceof jwt.JsonWebTokenError) {
          if (error.name === 'TokenExpiredError') {
            throw AuthErrors.tokenExpired();
          }
          throw AuthErrors.invalidToken();
        }
        
        // Handle Prisma errors
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        
        // Re-throw custom errors
        if (error.extensions?.code) {
          throw error;
        }

        // Handle unexpected errors
        console.error('Reset password error:', error);
        throw ServerErrors.internalError('Failed to reset password');
      }
    },
  },
};