/**
 * Google Authentication Service
 * Handles OAuth2 flow, token management, and authentication state
 */

import { gapi } from 'gapi-script';
import { getGoogleDriveConfig } from '../config/app-config';

export interface AuthState {
  isAuthenticated: boolean;
  user: gapi.auth2.GoogleUser | null;
  accessToken: string | null;
  error: string | null;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private authInstance: gapi.auth2.GoogleAuth | null = null;
  private initialized = false;
  private authListeners: ((state: AuthState) => void)[] = [];
  
  private constructor() {}
  
  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }
  
  /**
   * Initialize the Google API client library
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    const config = getGoogleDriveConfig();
    
    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: config.apiKey,
            clientId: config.clientId,
            discoveryDocs: config.discoveryDocs,
            scope: config.scopes.join(' ')
          });
          
          this.authInstance = gapi.auth2.getAuthInstance();
          this.initialized = true;
          
          // Listen for sign-in state changes
          this.authInstance.isSignedIn.listen((isSignedIn) => {
            this.notifyListeners();
          });
          
          // Check if already signed in
          if (this.authInstance.isSignedIn.get()) {
            this.saveTokens();
          }
          
          resolve();
        } catch (error) {
          console.error('Error initializing Google API:', error);
          reject(error);
        }
      });
    });
  }
  
  /**
   * Sign in the user
   */
  async signIn(): Promise<gapi.auth2.GoogleUser> {
    if (!this.authInstance) {
      throw new Error('Google Auth not initialized');
    }
    
    try {
      const user = await this.authInstance.signIn();
      this.saveTokens();
      this.notifyListeners();
      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    if (!this.authInstance) {
      throw new Error('Google Auth not initialized');
    }
    
    try {
      await this.authInstance.signOut();
      this.clearTokens();
      this.notifyListeners();
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    if (!this.authInstance) {
      return false;
    }
    return this.authInstance.isSignedIn.get();
  }
  
  /**
   * Get current user
   */
  getCurrentUser(): gapi.auth2.GoogleUser | null {
    if (!this.authInstance || !this.isAuthenticated()) {
      return null;
    }
    return this.authInstance.currentUser.get();
  }
  
  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    const user = this.getCurrentUser();
    if (!user) {
      // Try to get from localStorage
      const stored = this.getStoredTokens();
      if (stored && stored.expiresAt > Date.now()) {
        return stored.accessToken;
      }
      return null;
    }
    
    const authResponse = user.getAuthResponse();
    return authResponse.access_token || null;
  }
  
  /**
   * Refresh the access token if needed
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) {
      return null;
    }
    
    const authResponse = user.getAuthResponse();
    const expiresIn = authResponse.expires_in || 0;
    const expiresAt = authResponse.expires_at || 0;
    
    // Refresh if token expires in less than 5 minutes
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      try {
        const response = await user.reloadAuthResponse();
        this.saveTokens();
        return response.access_token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      }
    }
    
    return authResponse.access_token || null;
  }
  
  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    const isAuthenticated = this.isAuthenticated();
    const user = this.getCurrentUser();
    const accessToken = this.getAccessToken();
    
    return {
      isAuthenticated,
      user,
      accessToken,
      error: null
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
    const user = this.getCurrentUser();
    if (!user) {
      return;
    }
    
    const authResponse = user.getAuthResponse();
    const tokens: AuthTokens = {
      accessToken: authResponse.access_token,
      expiresAt: authResponse.expires_at
    };
    
    localStorage.setItem('lifemap-google-tokens', JSON.stringify(tokens));
  }
  
  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): AuthTokens | null {
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
  private clearTokens(): void {
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
   * Revoke access (for testing)
   */
  async revokeAccess(): Promise<void> {
    if (!this.authInstance) {
      throw new Error('Google Auth not initialized');
    }
    
    try {
      await this.authInstance.disconnect();
      this.clearTokens();
      this.notifyListeners();
    } catch (error) {
      console.error('Revoke access failed:', error);
      throw error;
    }
  }
}

export const googleAuthService = GoogleAuthService.getInstance();