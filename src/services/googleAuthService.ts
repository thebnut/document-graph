/**
 * Google Authentication Service using Google Identity Services
 * Handles OAuth2 token flow and authentication state
 */

import { getGoogleDriveConfig } from '../config/app-config';

// Google Identity Services types
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          hasGrantedAllScopes: (tokenResponse: TokenResponse, ...scopes: string[]) => boolean;
          hasGrantedAnyScope: (tokenResponse: TokenResponse, ...scopes: string[]) => boolean;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback?: (response: TokenResponse) => void;
  error_callback?: (error: any) => void;
  hint?: string;
  hosted_domain?: string;
  prompt?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: Partial<TokenClientConfig>) => void;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  error: string | null;
  userEmail: string | null;
}

export interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  scope: string;
  userEmail?: string;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private tokenClient: TokenClient | null = null;
  private currentToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private authListeners: ((state: AuthState) => void)[] = [];
  private userEmail: string | null = null;
  
  private constructor() {}
  
  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }
  
  /**
   * Initialize the Google Identity Services client
   */
  async initialize(): Promise<void> {
    const config = getGoogleDriveConfig();
    
    return new Promise((resolve, reject) => {
      // Check if Google Identity Services is loaded
      if (!window.google?.accounts?.oauth2) {
        // Wait for the script to load
        const checkInterval = setInterval(() => {
          if (window.google?.accounts?.oauth2) {
            clearInterval(checkInterval);
            this.initializeTokenClient(config, resolve, reject);
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Google Identity Services failed to load'));
        }, 5000);
      } else {
        this.initializeTokenClient(config, resolve, reject);
      }
    });
  }
  
  private initializeTokenClient(config: any, resolve: () => void, reject: (error: any) => void): void {
    try {
      // Load stored tokens first
      const stored = this.getStoredTokens();
      if (stored && stored.expiresAt > Date.now()) {
        this.currentToken = stored.accessToken;
        this.tokenExpiresAt = stored.expiresAt;
        this.userEmail = stored.userEmail || null;
      }
      
      // Initialize the token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
        callback: (tokenResponse) => {
          this.handleTokenResponse(tokenResponse);
        },
        error_callback: (error) => {
          console.error('Token client error:', error);
          this.notifyListeners();
        }
      });
      
      resolve();
    } catch (error) {
      reject(error);
    }
  }
  
  /**
   * Handle token response from Google
   */
  private handleTokenResponse(response: TokenResponse): void {
    if (response.error) {
      console.error('Token error:', response.error, response.error_description);
      this.currentToken = null;
      this.tokenExpiresAt = null;
      this.clearStoredTokens();
      this.notifyListeners();
      return;
    }
    
    // Store the new token
    this.currentToken = response.access_token;
    this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);
    
    // Get user info with the token
    this.fetchUserInfo(response.access_token);
    
    // Save tokens
    this.saveTokens();
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Fetch user info using the access token
   */
  private async fetchUserInfo(accessToken: string): Promise<void> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const userInfo = await response.json();
        this.userEmail = userInfo.email;
        this.saveTokens(); // Update stored tokens with email
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  }
  
  /**
   * Request access token (sign in)
   */
  async signIn(): Promise<void> {
    if (!this.tokenClient) {
      throw new Error('Google Auth not initialized');
    }
    
    return new Promise((resolve, reject) => {
      // Set up one-time callbacks for this sign-in attempt
      this.tokenClient!.requestAccessToken({
        callback: (response) => {
          this.handleTokenResponse(response);
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else {
            resolve();
          }
        },
        error_callback: (error) => {
          console.error('Sign in error:', error);
          reject(error);
        },
        prompt: 'select_account' // Force account selection
      });
    });
  }
  
  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    if (this.currentToken) {
      // Revoke the token
      return new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(this.currentToken!, () => {
          this.currentToken = null;
          this.tokenExpiresAt = null;
          this.userEmail = null;
          this.clearStoredTokens();
          this.notifyListeners();
          resolve();
        });
      });
    } else {
      this.clearStoredTokens();
      this.notifyListeners();
    }
  }
  
  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.currentToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now());
  }
  
  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    if (this.isAuthenticated()) {
      return this.currentToken;
    }
    return null;
  }
  
  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      accessToken: this.getAccessToken(),
      error: null,
      userEmail: this.userEmail
    };
  }
  
  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Save tokens to localStorage
   */
  private saveTokens(): void {
    if (this.currentToken && this.tokenExpiresAt) {
      const tokens: StoredTokens = {
        accessToken: this.currentToken,
        expiresAt: this.tokenExpiresAt,
        scope: getGoogleDriveConfig().scopes.join(' '),
        userEmail: this.userEmail || undefined
      };
      
      localStorage.setItem('lifemap-google-tokens', JSON.stringify(tokens));
    }
  }
  
  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): StoredTokens | null {
    try {
      const stored = localStorage.getItem('lifemap-google-tokens');
      if (!stored) {
        return null;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error reading stored tokens:', error);
      return null;
    }
  }
  
  /**
   * Clear stored tokens
   */
  private clearStoredTokens(): void {
    localStorage.removeItem('lifemap-google-tokens');
  }
  
  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(): void {
    const state = this.getAuthState();
    this.authListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }
  
  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    if (!this.tokenExpiresAt) return true;
    
    // Refresh if token expires in less than 5 minutes
    return this.tokenExpiresAt - Date.now() < 5 * 60 * 1000;
  }
  
  /**
   * Request a new token (for refresh)
   */
  async refreshToken(): Promise<void> {
    if (!this.tokenClient) {
      throw new Error('Google Auth not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.tokenClient!.requestAccessToken({
        callback: (response) => {
          this.handleTokenResponse(response);
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else {
            resolve();
          }
        },
        error_callback: (error) => {
          reject(error);
        },
        prompt: '' // Don't show account chooser for refresh
      });
    });
  }
}

export const googleAuthService = GoogleAuthService.getInstance();