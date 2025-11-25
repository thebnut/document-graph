# Lifemap Builder - Manual Test Plan

## Overview
This document outlines the manual testing procedures for the lifemap builder onboarding wizard feature.

## Prerequisites
- Google account with no existing lifemap data in Google Drive
- Test documents (PDFs, images) that contain identifiable people and information
- Browser with Google Drive access

## Test Scenarios

### Scenario 1: First-Time User Onboarding (Happy Path)

**Steps:**
1. Clear Google Drive folder or use a fresh Google account
2. Navigate to the application and sign in with Google
3. Verify onboarding wizard appears automatically
4. **Step 1: Family Name Entry**
   - Enter a family name (e.g., "Thebault Family")
   - Verify validation (minimum 2 characters)
   - Click "Continue"
5. **Step 2: Document Upload**
   - Drag & drop multiple documents OR click to browse
   - Verify file type validation (PDF, PNG, JPG, JPEG only)
   - Verify file list displays correctly
   - Remove a file and verify it's removed
   - Click "Start Building" with at least one document
6. **Step 3: Build Progress**
   - Verify progress bar shows activity
   - Verify phase changes: Analyzing → Extracting People → Creating Tree → Placing Documents
   - Verify real-time stats update (files processed, people found, nodes created)
   - Verify people detected list populates with confidence scores
7. **Step 4: Build Results**
   - Verify success message or warning message (if errors occurred)
   - Verify statistics display correctly:
     - People Created count
     - Categories Created count
     - Documents Placed count
   - Verify people list shows all created persons with their categories
   - Verify "Next Steps" guidance is displayed
   - Click "View Your Lifemap"
8. **Post-Onboarding**
   - Verify wizard closes
   - Verify lifemap graph appears with created nodes
   - Verify family root node exists
   - Verify person nodes (level 1) are visible
   - Verify category nodes (level 2) are visible
   - Verify documents are attached to correct categories
   - Verify data persists in Google Drive

**Expected Results:**
- ✅ Wizard appears for first-time users
- ✅ All 4 steps complete successfully
- ✅ People are extracted from documents
- ✅ Lifemap structure is created automatically
- ✅ Documents are placed in appropriate categories
- ✅ Data is saved to Google Drive
- ✅ Family name is saved to metadata

---

### Scenario 2: Returning User (No Wizard)

**Steps:**
1. Sign in with a Google account that already has lifemap data
2. Navigate to the application

**Expected Results:**
- ✅ No onboarding wizard appears
- ✅ Existing lifemap loads from Google Drive
- ✅ All existing nodes and relationships are displayed

---

### Scenario 3: Wizard Cancellation During Build

**Steps:**
1. Start onboarding wizard as first-time user
2. Complete family name and document upload steps
3. During the "Building" progress step, click the close/cancel button
4. Verify confirmation dialog appears
5. Click "Cancel" in the dialog to abort closing
6. Verify build continues
7. Click close button again and confirm cancellation

**Expected Results:**
- ✅ Confirmation dialog prevents accidental cancellation
- ✅ Build can continue if user cancels the close action
- ✅ Wizard closes if user confirms cancellation

---

### Scenario 4: Empty Document Upload

**Steps:**
1. Start onboarding wizard
2. Complete family name step
3. On document upload step, click "Start Building" without uploading any documents

**Expected Results:**
- ✅ Error message: "Please add at least one document"
- ✅ User cannot proceed without documents

---

### Scenario 5: Invalid File Types

**Steps:**
1. Start onboarding wizard
2. Complete family name step
3. Try to upload unsupported file types (e.g., .txt, .docx, .xlsx)

**Expected Results:**
- ✅ Files are filtered out
- ✅ Warning message shows: "X file(s) skipped - unsupported format"
- ✅ Only supported formats (PDF, PNG, JPG, JPEG) are accepted

---

### Scenario 6: Build Errors Handling

**Steps:**
1. Start onboarding wizard
2. Upload documents that may cause processing errors
3. Complete the build process

**Expected Results:**
- ✅ Wizard shows warning icon if errors occurred
- ✅ Results step displays "Lifemap Created with Warnings"
- ✅ Error list shows up to 5 errors with "...and X more" if > 5
- ✅ Successfully processed documents are still added to lifemap
- ✅ User can still proceed to view lifemap

---

### Scenario 7: Large Document Set

**Steps:**
1. Start onboarding wizard
2. Upload 10+ documents
3. Monitor build progress

**Expected Results:**
- ✅ Progress bar updates smoothly
- ✅ Stats update in real-time
- ✅ No UI freezing or performance issues
- ✅ All documents are processed
- ✅ Build completes successfully

---

### Scenario 8: Person Deduplication

**Steps:**
1. Upload multiple documents that reference the same person with slight name variations
   - e.g., "Brett Thebault", "B. Thebault", "Brett T."
2. Monitor person detection in build progress
3. Check final results

**Expected Results:**
- ✅ Duplicate people are merged (fuzzy matching)
- ✅ Final person count reflects deduplicated list
- ✅ Documents from all variations are attached to single person node

---

## Data Validation

After completing onboarding, verify in Google Drive:

1. **File: `document-graph.json` exists**
   - Check metadata.familyName is set correctly
   - Check entities array contains created persons and categories
   - Check relationships array links documents to categories

2. **Folder Structure:**
   - Lifemap Documents folder exists
   - Person folders created for each detected person
   - Uploaded documents are stored in person folders

---

## Known Limitations

1. Only processes PDF, PNG, JPG, JPEG files
2. Person extraction quality depends on document content clarity
3. Document placement accuracy depends on AI analysis quality
4. Requires Google Drive authentication

---

## Regression Tests

Verify these existing features still work after lifemap builder integration:

- ✅ Manual node creation
- ✅ Manual document upload
- ✅ Bulk document upload
- ✅ Node expansion/collapse
- ✅ Search functionality
- ✅ Document viewer
- ✅ Graph layout
- ✅ Dark mode toggle
- ✅ Google Drive sync
- ✅ Node drag and drop

---

## Performance Benchmarks

- **Family name validation:** < 100ms
- **Document upload UI:** < 200ms per file
- **Build initiation:** < 1s
- **Person extraction:** ~2-5s per document (depends on API)
- **Graph rendering after onboarding:** < 2s
- **Google Drive save:** < 3s

---

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Test Data Recommendations

For best test coverage, use documents containing:
1. Clear person names (e.g., "Brett Thebault")
2. Different document types (passports, birth certificates, medical records)
3. Multiple people to test multi-person scenarios
4. Varying document quality (clear vs. blurry) to test error handling

---

## Success Criteria

The lifemap builder feature is considered successful if:

1. ✅ First-time users see the wizard automatically
2. ✅ All 4 wizard steps complete without crashes
3. ✅ At least 80% of uploaded documents are processed successfully
4. ✅ Person extraction accuracy is > 70% (validated manually)
5. ✅ Lifemap structure is created correctly with family root, people, categories, and documents
6. ✅ Data persists to Google Drive
7. ✅ Returning users don't see the wizard
8. ✅ No regressions in existing features

---

## Bug Reporting Template

When reporting issues, include:

```
**Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [version number]
- OS: [Windows/Mac/Linux]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Videos:**
[attach if applicable]

**Console Errors:**
[paste console output]

**Additional Context:**
- Number of documents uploaded:
- Document types:
- Family name used:
```

---

## Next Steps

After manual testing:
1. Document any bugs found
2. Create automated E2E tests for critical paths
3. Performance optimization if needed
4. User acceptance testing with real users
