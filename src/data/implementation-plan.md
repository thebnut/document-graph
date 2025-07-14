# Standalone Data Model Implementation Plan

## Overview
Implement a platform-agnostic data model with Google Drive integration for secure document storage.

## Phase 1: Foundation (Current Sprint)
### 1.1 Data Model Updates
- [x] Create standalone model specification
- [x] Define TypeScript interfaces
- [x] Build reference implementation
- [ ] Fix TypeScript issues in implementation
- [ ] Add Google Drive specific types

### 1.2 Google Drive Integration
- [ ] Update DocumentReference for Google Drive
  - Use Google Drive file IDs instead of URLs
  - Support OAuth2 authentication flow
  - Handle temporary access tokens
- [ ] Create GoogleDriveAdapter class
  - Methods to fetch documents on demand
  - Handle authentication refresh
  - Cache management

### 1.3 Migration Layer
- [ ] Create migration utilities
  - Convert existing local paths to Drive references
  - Preserve all metadata
  - Generate change log entries
- [ ] Build backward compatibility adapter
  - Allow existing UI to work with new model
  - Map old documentPath to new documents array

## Phase 2: Integration (Next Sprint)
### 2.1 Update Services
- [ ] Refactor DataService to use standalone model
- [ ] Create new search implementation
- [ ] Add document fetching logic

### 2.2 UI Updates
- [ ] Update DocumentViewer for Google Drive
- [ ] Add authentication UI components
- [ ] Handle loading states for remote documents

### 2.3 Configuration
- [ ] Add app configuration system
  - Domain setting (lifemap.au)
  - Google Drive API keys
  - Storage preferences

## Phase 3: Testing & Deployment
### 3.1 Testing
- [ ] Unit tests for standalone model
- [ ] Integration tests with Google Drive
- [ ] Migration testing with sample data

### 3.2 Documentation
- [ ] Update CLAUDE.md with new architecture
- [ ] Create user guide for Google Drive setup
- [ ] API documentation for standalone model

## Implementation Details

### Google Drive Document Reference
```typescript
interface GoogleDriveReference {
  id: string;
  type: 'google-drive';
  fileId: string;              // Google Drive file ID
  fileName: string;
  mimeType: string;
  size?: number;
  
  // Authentication
  driveAccount?: string;       // User's Google account
  requiresAuth: true;
  
  // Metadata from Drive
  createdTime?: string;
  modifiedTime?: string;
  owners?: string[];
  permissions?: string[];
  
  // Caching
  lastAccessed?: string;
  cachedUrl?: string;          // Temporary download URL
  cacheExpiry?: string;
}
```

### App Configuration
```typescript
interface AppConfig {
  app: {
    name: string;              // "LifeMap"
    domain: string;            // "lifemap.au"
    version: string;
  };
  
  storage: {
    provider: 'google-drive';
    clientId: string;
    apiKey: string;
    scopes: string[];
  };
  
  features: {
    offlineMode: boolean;
    autoSync: boolean;
    encryptionEnabled: boolean;
  };
}
```

### Migration Strategy
1. **Detect existing data format**
   - Check for documentPath field
   - Identify local file references

2. **Create placeholder Drive entries**
   - Generate temporary file IDs
   - Mark as "pending upload"

3. **Prompt user for Drive connection**
   - OAuth2 flow
   - Select destination folder

4. **Upload local files to Drive**
   - Batch upload process
   - Update references with real file IDs

5. **Verify and cleanup**
   - Ensure all files accessible
   - Remove old documentPath fields

## Success Criteria
- ✅ All documents stored securely in Google Drive
- ✅ Seamless authentication experience
- ✅ Fast document retrieval with caching
- ✅ Backward compatibility maintained
- ✅ Search works offline
- ✅ Mobile-ready data structure

## Risk Mitigation
- **Drive API limits**: Implement caching and rate limiting
- **Authentication expiry**: Auto-refresh tokens
- **Offline access**: Cache essential metadata
- **Migration failures**: Rollback mechanism
- **Performance**: Lazy loading and pagination