/**
 * Debug utilities for Google Authentication
 */

import { googleAuthService } from '../services/googleAuthService';

export const googleAuthDebug = {
  /**
   * Check current auth status
   */
  checkStatus() {
    console.log('🔍 Checking Google Auth Status...');
    
    // Check if authenticated
    const isAuth = googleAuthService.isAuthenticated();
    console.log(`Authenticated: ${isAuth ? '✅ YES' : '❌ NO'}`);
    
    // Get auth state
    const authState = googleAuthService.getAuthState();
    console.log('Auth State:', authState);
    
    // Check stored tokens
    const stored = localStorage.getItem('lifemap-google-tokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored);
        console.log('Stored tokens:', {
          hasToken: !!tokens.accessToken,
          expiresAt: new Date(tokens.expiresAt).toLocaleString(),
          expired: tokens.expiresAt < Date.now(),
          userEmail: tokens.userEmail
        });
      } catch (e) {
        console.error('Failed to parse stored tokens');
      }
    } else {
      console.log('No stored tokens found');
    }
    
    return authState;
  },
  
  /**
   * Clear all auth data
   */
  clearAuth() {
    console.log('🗑️ Clearing auth data...');
    localStorage.removeItem('lifemap-google-tokens');
    console.log('✅ Auth data cleared');
  },
  
  /**
   * Test authentication with visual feedback
   */
  async testAuthWithFeedback() {
    console.log('🚀 Starting auth test with feedback...');
    
    try {
      // Initialize
      console.log('1️⃣ Initializing Google Identity Services...');
      await googleAuthService.initialize();
      console.log('   ✅ Initialized');
      
      // Check current status
      console.log('2️⃣ Checking current auth status...');
      const beforeAuth = googleAuthService.isAuthenticated();
      console.log(`   ${beforeAuth ? '✅ Already authenticated' : '❌ Not authenticated'}`);
      
      if (!beforeAuth) {
        console.log('3️⃣ Starting sign-in flow...');
        console.log('   📱 A popup should appear - please sign in');
        
        await googleAuthService.signIn();
        
        console.log('   ✅ Sign-in completed!');
        
        // Check status after sign in
        const afterAuth = googleAuthService.isAuthenticated();
        const authState = googleAuthService.getAuthState();
        
        console.log('4️⃣ Verifying authentication...');
        console.log(`   Authenticated: ${afterAuth ? '✅ YES' : '❌ NO'}`);
        console.log(`   User Email: ${authState.userEmail || 'Not available'}`);
        console.log(`   Has Token: ${authState.accessToken ? '✅ YES' : '❌ NO'}`);
      }
      
      console.log('\n✨ Auth test complete!');
      return true;
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      return false;
    }
  }
};

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).googleAuthDebug = googleAuthDebug;
  console.log('🔧 Debug utilities available:');
  console.log('   googleAuthDebug.checkStatus() - Check current auth status');
  console.log('   googleAuthDebug.clearAuth() - Clear stored auth data');
  console.log('   googleAuthDebug.testAuthWithFeedback() - Test auth with detailed feedback');
}