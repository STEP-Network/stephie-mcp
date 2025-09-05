// Mock auth for local testing when Stack Auth is not available

export interface AuthValidation {
  valid: boolean;
  userId?: string;
  error?: string;
}

export interface UserPermissions {
  canUsePublisherTools: boolean;
  canUseForecastTools: boolean;
  canUseMemoryTools: boolean;
  rateLimit: number;
}

export class MockAuthValidator {
  async validateToken(token: string): Promise<AuthValidation> {
    // For local testing, accept "test-token" as valid
    if (token === 'test-token' || token === 'Bearer test-token') {
      return {
        valid: true,
        userId: 'test-user-123'
      };
    }

    // In production, this would validate against Stack Auth
    // Use stderr for warnings - stdout must be clean for MCP protocol
    console.error('⚠️  Using mock auth - Stack Auth not configured');
    console.error('   For production, set NEXT_PUBLIC_STACK_PROJECT_ID and STACK_SECRET_SERVER_KEY');
    
    return {
      valid: true, // Allow for testing
      userId: 'mock-user-' + Math.random().toString(36).substring(7)
    };
  }

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    // Return full permissions for testing
    return {
      canUsePublisherTools: true,
      canUseForecastTools: true,
      canUseMemoryTools: true,
      rateLimit: 1000,
    };
  }
}