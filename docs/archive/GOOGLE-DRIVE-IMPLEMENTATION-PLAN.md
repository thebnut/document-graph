# Google Drive Authentication & File Management Implementation Plan

## Overview
Implement Google Drive authentication on app load, create folder structure, and save the data model to Drive. 

## Phase 1: Google Drive API Setup

### 1.1 Create Google Cloud Project
- Set up project at console.cloud.google.com
- Enable Google Drive API
- Create OAuth 2.0 credentials
- Add authorized JavaScript origins (http://localhost:3000, https://lifemap.au)
- Add authorized redirect URIs

### 1.2 Install Google API Client
```bash
npm install @types/gapi @types/gapi.auth2 @types/gapi.client @types/gapi.client.drive
```

### 1.3 Create Environment Variables
```env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id
REACT_APP_GOOGLE_API_KEY=your-api-key
```

## Phase 2: Authentication Service

### 2.1 Create Google Auth Service
`src/services/googleAuthService.ts`:
- Initialize Google API client
- Handle OAuth2 flow
- Store tokens in localStorage
- Auto-refresh tokens
- Check authentication status

### 2.2 Create Google Drive Service
`src/services/googleDriveService.ts`:
- Folder creation methods
- File upload/download
- Search functionality
- Permission management

## Phase 3: Folder Structure Implementation

### 3.1 Root Folder Structure
```
Google Drive/
└── lifemap-data/              # Root folder for all LifeMap data
    ├── data-model/            # JSON data models
    │   └── document-graph.json # Current data model
    └── documents/             # All document files
        ├── Brett Thebault/    # Person-specific folders
        ├── Gemma Thebault/
        ├── Freya Thebault/
        ├── Anya Thebault/
        └── Household/         # Shared family documents
```

### 3.2 Folder Creation Logic
- Check if lifemap-data exists
- Create if missing
- Create sub-folders
- Set appropriate permissions

## Phase 4: Authentication Flow

### 4.1 App Initialization
1. Check localStorage for saved auth tokens
2. If no tokens, show authentication prompt
3. Handle Google OAuth2 flow
4. Save tokens to localStorage
5. Initialize Drive service

### 4.2 Create Auth Component
`src/components/GoogleDriveAuth.tsx`:
- Modal/overlay for authentication
- Google sign-in button
- Loading states
- Error handling

### 4.3 Update App.tsx
- Add auth check on mount
- Show auth component if needed
- Block app usage until authenticated

## Phase 5: Data Model Synchronization

### 5.1 Save Data Model to Drive
- Convert current model to JSON
- Save to lifemap-data/data-model/document-graph.json
- Update on every change (debounced)
- Version control with timestamps

### 5.2 Load Data Model from Drive
- On app start, after auth
- Load from lifemap-data/data-model/document-graph.json
- Merge with local changes if needed
- Handle conflicts

## Phase 6: Document Organization

### 6.1 Person Folder Mapping
- Extract unique person names from data model
- Create folder for each person
- Map documents to correct folders based on ownership

### 6.2 File References Update
- Update document references in model
- Store Google Drive file IDs
- Update locations to proper Drive paths

## Phase 7: Implementation Files

### 7.1 Core Services
1. `googleAuthService.ts` - Authentication handling
2. `googleDriveService.ts` - Drive operations
3. `googleDriveAdapter.ts` - Convert between model and Drive

### 7.2 UI Components
1. `GoogleDriveAuth.tsx` - Auth UI
2. `DriveStatusIndicator.tsx` - Connection status
3. `SyncProgress.tsx` - Sync status display

### 7.3 Hooks
1. `useGoogleAuth.ts` - Auth state management
2. `useDriveSync.ts` - Sync operations

## Phase 8: Error Handling

### 8.1 Auth Errors
- Invalid credentials
- Revoked access
- Network issues
- Token expiration

### 8.2 Drive Errors
- Quota exceeded
- Permission denied
- File not found
- Sync conflicts

## Phase 9: Testing Plan

### 9.1 Initial Setup Test
1. Clear all auth data
2. Load app
3. Complete auth flow
4. Verify folder creation
5. Check data model saved

### 9.2 Manual File Testing
After implementation:
1. User adds files to person folders
2. App discovers new files
3. Updates references in model
4. Displays in UI

## Implementation Order

1. **Google Auth Service** - Basic authentication
2. **Drive Service** - Folder operations
3. **Auth UI Component** - User interface
4. **App Integration** - Wire up auth check
5. **Folder Creation** - Create structure
6. **Data Model Save** - Save JSON to Drive
7. **Data Model Load** - Load on startup
8. **Error Handling** - Comprehensive errors
9. **Testing** - Full flow test

## Key Decisions

1. **Folder Structure**: Organized by person for easy manual management
2. **Auth Storage**: localStorage for persistence
3. **Sync Strategy**: Save on change, load on start
4. **Permissions**: App-specific folder only
5. **Conflict Resolution**: Last-write-wins for now

## Code Examples

### Example: Google Auth Service Structure
```typescript
class GoogleAuthService {
  private client: gapi.auth2.GoogleAuth;
  
  async initialize(): Promise<void> {
    // Load Google API
    // Initialize auth client
  }
  
  async signIn(): Promise<gapi.auth2.GoogleUser> {
    // Handle sign in flow
  }
  
  async checkAuth(): Promise<boolean> {
    // Check if user is authenticated
  }
  
  getAccessToken(): string | null {
    // Get current access token
  }
}
```

### Example: Drive Service Structure
```typescript
class GoogleDriveService {
  async createFolder(name: string, parentId?: string): Promise<string> {
    // Create folder and return ID
  }
  
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    // Search for folder by name
  }
  
  async ensureFolderStructure(): Promise<FolderStructure> {
    // Create complete folder structure
  }
  
  async saveDataModel(model: StandaloneDocumentGraph): Promise<void> {
    // Save JSON to Drive
  }
  
  async loadDataModel(): Promise<StandaloneDocumentGraph | null> {
    // Load JSON from Drive
  }
}
```

### Example: Auth Component
```tsx
const GoogleDriveAuth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSignIn = async () => {
    setLoading(true);
    try {
      await googleAuthService.signIn();
      await googleDriveService.ensureFolderStructure();
      // Continue to app
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-modal">
      <h2>Connect to Google Drive</h2>
      <p>LifeMap needs access to Google Drive to store your documents.</p>
      <button onClick={handleSignIn} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect Google Drive'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

## Next Steps

1. Set up Google Cloud Project and get credentials
2. Install required npm packages
3. Implement services in order listed above
4. Test with real Google Drive account
5. Add file discovery functionality (Phase 2)

This plan provides a complete authentication system with automatic folder creation and data persistence to Google Drive.