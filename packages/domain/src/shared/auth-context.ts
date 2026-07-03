export interface AuthContext {
  userId: string; // Cognito sub
  email?: string;
  groups: string[];
  isGlobalAdmin: boolean;
}
