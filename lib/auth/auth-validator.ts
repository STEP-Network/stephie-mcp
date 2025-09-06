// Unified auth validator that uses Stack Auth when available, mock otherwise

import { MockAuthValidator, type AuthValidation, type UserPermissions } from './mock-auth.js';

let StackServerApp: any;

// Load Stack module asynchronously
(async () => {
  try {
    // Try to import Stack - will fail if not available
    const stackModule = await import('@stackframe/stack');
    StackServerApp = stackModule.StackServerApp;
  } catch (error) {
    // Use stderr for logging - stdout must be clean for MCP protocol
    console.error('Stack Auth not available, using mock auth for local testing');
  }
})();

export { AuthValidation, UserPermissions };

export class AuthValidator {
  private validator: any;

  constructor() {
    // For now, always use mock auth until Stack Auth is properly configured
    // TODO: Enable Stack Auth when proper server-side validation is available
    const useStackAuth = false; // StackServerApp && process.env.NEXT_PUBLIC_STACK_PROJECT_ID && process.env.STACK_SECRET_SERVER_KEY;
    
    if (useStackAuth) {
      // Use real Stack Auth
      const stackApp = new StackServerApp({
        tokenStore: 'none',
      });
      
      this.validator = {
        validateToken: async (token: string): Promise<AuthValidation> => {
          try {
            const cleanToken = token.replace('Bearer ', '');
            const user = await stackApp.verifyTokenWithoutDatabase(cleanToken);
            
            if (user) {
              return { 
                valid: true, 
                userId: user.userId 
              };
            }
            
            return { 
              valid: false, 
              error: 'Invalid token' 
            };
          } catch (error) {
            console.error('Token validation failed:', error);
            return { 
              valid: false, 
              error: error instanceof Error ? error.message : 'Token validation failed' 
            };
          }
        },
        
        getUserPermissions: async (userId: string): Promise<UserPermissions> => {
          try {
            const user = await stackApp.getUser({ userId });
            const metadata = user?.clientMetadata || {};
            
            return {
              canUsePublisherTools: metadata.canUsePublisherTools !== false,
              canUseForecastTools: metadata.canUseForecastTools !== false,
              canUseMemoryTools: metadata.canUseMemoryTools !== false,
              rateLimit: metadata.rateLimit || 100,
            };
          } catch (error) {
            console.error('Failed to get user permissions:', error);
            return {
              canUsePublisherTools: true,
              canUseForecastTools: true,
              canUseMemoryTools: true,
              rateLimit: 100,
            };
          }
        }
      };
      
      console.error('✓ Using Stack Auth for authentication');
    } else {
      // Use mock auth for local testing
      this.validator = new MockAuthValidator();
      console.error('⚠️  Using mock auth for local testing');
    }
  }

  async validateToken(token: string): Promise<AuthValidation> {
    return this.validator.validateToken(token);
  }

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    return this.validator.getUserPermissions(userId);
  }
}