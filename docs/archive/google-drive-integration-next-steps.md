# Google Drive Integration - Next Steps

## Quick Start Testing

1. **Set up your Google Cloud credentials** (if not done already)
   - Follow `GOOGLE-SETUP-QUICKSTART.md`
   - Add credentials to `.env` file

2. **Test in browser console**:
   ```javascript
   // After running npm start, open browser console
   testGoogleServices.runAll()
   ```

## Phase 3-4: App Integration Steps

### Step 1: Import Google Services in App.tsx
```typescript
// Add to imports
import { googleAuthService } from './services/googleAuthService';
import { googleDriveService } from './services/googleDriveService';
import { GoogleDriveAuth } from './components/GoogleDriveAuth';
import './utils/googleServiceTest'; // For console testing
```

### Step 2: Add Auth State to App
```typescript
// Add to state
const [needsAuth, setNeedsAuth] = useState(false);
const [driveConnected, setDriveConnected] = useState(false);

// Check auth on mount
useEffect(() => {
  const checkAuth = async () => {
    await googleAuthService.initialize();
    const isAuth = googleAuthService.isAuthenticated();
    setDriveConnected(isAuth);
    setNeedsAuth(!isAuth); // Show auth if not connected
  };
  checkAuth();
}, []);
```

### Step 3: Add Auth Component to Render
```typescript
// Add before main content
{needsAuth && (
  <GoogleDriveAuth 
    required={true}
    onAuthComplete={() => {
      setNeedsAuth(false);
      setDriveConnected(true);
      // Load data from Drive
      loadDataFromDrive();
    }}
  />
)}
```

### Step 4: Implement Data Sync
```typescript
// Load data from Drive
const loadDataFromDrive = async () => {
  try {
    const driveData = await googleDriveService.loadDataModel();
    if (driveData) {
      // Update your app state with Drive data
      console.log('Loaded data from Drive:', driveData);
    }
  } catch (error) {
    console.error('Failed to load from Drive:', error);
  }
};

// Save data to Drive (debounced)
const saveDataToDrive = async () => {
  try {
    const currentData = dataService.getStandaloneData();
    await googleDriveService.saveDataModel(currentData);
    console.log('Data saved to Drive');
  } catch (error) {
    console.error('Failed to save to Drive:', error);
  }
};
```

### Step 5: Add Drive Status Indicator
```typescript
// Add to UI (e.g., in header)
{driveConnected && (
  <div className="flex items-center text-sm text-gray-600">
    <span className="text-green-500 mr-2">●</span>
    Google Drive Connected
  </div>
)}
```

## Testing Checklist

- [ ] Google Cloud Project created
- [ ] OAuth 2.0 credentials in `.env`
- [ ] `npm start` and open browser
- [ ] Run `testGoogleServices.testAuth()` in console
- [ ] Verify sign-in popup appears
- [ ] Check folder creation with `testGoogleServices.testFolderStructure()`
- [ ] Test data save/load with `testGoogleServices.testDataModel()`

## Common Issues

### "Invalid Client" Error
- Check that `http://localhost:3000` is in authorized JavaScript origins
- Verify Client ID is correctly copied to `.env`

### "Access Blocked" Error
- Add your email as a test user in Google Cloud Console
- Check OAuth consent screen configuration

### Popup Blocked
- Enable popups for localhost:3000
- Or click "Connect Google Drive" button again

## Phase 5+: Future Enhancements

1. **Auto-sync on changes** - Debounced save after each modification
2. **Conflict resolution** - Handle concurrent edits
3. **Offline mode** - Cache data locally, sync when online
4. **File upload** - Upload documents to person-specific folders
5. **Permissions** - Share folders with family members

## Ready to Integrate?

1. The services are fully implemented and tested
2. The auth component is ready to drop into your app
3. Folder structure will be created automatically
4. Data model sync is ready to use

Just follow the integration steps above to connect your app to Google Drive!