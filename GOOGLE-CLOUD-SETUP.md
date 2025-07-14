# Google Cloud Console Setup Guide

This guide walks you through setting up Google Drive API access for LifeMap.

## Prerequisites
- A Google account
- Access to Google Cloud Console (https://console.cloud.google.com)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter project details:
   - **Project Name**: `LifeMap`
   - **Project ID**: (auto-generated, or customize)
5. Click "Create"

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, ensure your LifeMap project is selected
2. Go to "APIs & Services" > "Library"
3. Search for "Google Drive API"
4. Click on "Google Drive API" in the results
5. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Click "Configure Consent Screen"
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in the required fields:
     - **App name**: `LifeMap`
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click "Save and Continue"
   - **Scopes**: Click "Add or Remove Scopes"
     - Search and select these scopes:
       - `https://www.googleapis.com/auth/drive.file` (Files created by app)
       - `https://www.googleapis.com/auth/drive.appdata` (App configuration data)
       - `https://www.googleapis.com/auth/drive.metadata` (File metadata)
   - Click "Update" then "Save and Continue"
   - **Test users**: Add your email and any other test emails
   - Click "Save and Continue"

4. Now create the OAuth client ID:
   - Application type: "Web application"
   - Name: "LifeMap Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://lifemap.au` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `https://lifemap.au` (for production)
   - Click "Create"

5. **Important**: Save your credentials:
   - Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - This goes in your `.env` file as `REACT_APP_GOOGLE_CLIENT_ID`

## Step 4: Create an API Key

1. In "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. (Optional) Click "Edit API key" to add restrictions:
   - Application restrictions: "HTTP referrers"
   - Website restrictions:
     - `http://localhost:3000/*`
     - `https://lifemap.au/*`
   - API restrictions: "Restrict key"
   - Select APIs: "Google Drive API"
4. Copy the API key
5. This goes in your `.env` file as `REACT_APP_GOOGLE_API_KEY`

## Step 5: Configure Your .env File

1. Open `.env` in your project root
2. Add your credentials:
```env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=your-api-key-here
```

## Step 6: Test Your Setup

1. Make sure your development server is stopped
2. Restart it with `npm start`
3. The app should now have access to Google Drive API

## Important Notes

### OAuth Consent Screen Status
- Your app will start in "Testing" mode
- Only test users you added can use the app
- To go to production, you'll need to submit for verification

### Quotas and Limits
- Google Drive API has usage quotas
- Default is 1,000,000,000 queries per day
- 1,000 queries per 100 seconds per user

### Security Best Practices
- Never commit your `.env` file to git
- Use different credentials for development and production
- Regularly rotate your API keys
- Monitor usage in Google Cloud Console

## Troubleshooting

### "Invalid Client" Error
- Ensure your Client ID is correctly copied
- Check that your current URL is in the authorized origins

### "Access Blocked" Error
- Make sure you're logged in with a test user email
- Check that all required scopes are added

### "API Key Invalid" Error
- Verify the API key is correctly copied
- Check API key restrictions match your domain

## Next Steps

After completing this setup:
1. The app can now authenticate users with Google
2. Users can authorize access to their Google Drive
3. The app can create folders and save files to Google Drive

See the main implementation plan for Phase 2: Authentication Service.