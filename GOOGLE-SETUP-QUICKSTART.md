# Google Cloud Setup - Quick Reference

## 🚀 5-Minute Setup

### 1. Create Project
- Go to: https://console.cloud.google.com
- New Project → Name: "LifeMap"

### 2. Enable API
- APIs & Services → Library
- Search "Google Drive API" → Enable

### 3. Configure OAuth Consent
- APIs & Services → OAuth consent screen
- External → App name: "LifeMap"
- Add Scopes:
  - `drive.file`
  - `drive.appdata`
  - `drive.metadata`
- Add test users (your email)

### 4. Create Credentials

#### OAuth Client ID:
- APIs & Services → Credentials → Create Credentials → OAuth client ID
- Type: Web application
- Authorized origins:
  ```
  http://localhost:3000
  https://lifemap.au
  ```
- Copy Client ID → `.env` → `REACT_APP_GOOGLE_CLIENT_ID`

#### API Key:
- Create Credentials → API key
- Copy → `.env` → `REACT_APP_GOOGLE_API_KEY`

### 5. Update .env
```env
REACT_APP_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=your-api-key-here
```

### 6. Restart App
```bash
npm start
```

## ✅ Checklist
- [ ] Project created in Google Cloud Console
- [ ] Google Drive API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth Client ID created and copied
- [ ] API Key created and copied
- [ ] Both credentials added to `.env`
- [ ] App restarted

## 🔗 Direct Links
- [Google Cloud Console](https://console.cloud.google.com)
- [API Library](https://console.cloud.google.com/apis/library)
- [Credentials](https://console.cloud.google.com/apis/credentials)
- [OAuth Consent](https://console.cloud.google.com/apis/credentials/consent)

## ⚠️ Common Issues
- **Invalid Client**: Check authorized origins include your current URL
- **Access Blocked**: Add your email as test user
- **API Key Invalid**: Check key restrictions