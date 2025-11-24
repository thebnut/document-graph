# Lifemap Builder: Gap Analysis & Implementation Plan

**Document Version:** 1.0
**Date:** 2025-11-24
**Author:** Claude Code Analysis
**Purpose:** Assess current capabilities vs. vision for first-time lifemap initialization flow with bulk document upload and person detection

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Vision Statement](#vision-statement)
3. [Current State Analysis](#current-state-analysis)
4. [Gap Analysis](#gap-analysis)
5. [Architecture Considerations](#architecture-considerations)
6. [Implementation Plan](#implementation-plan)
7. [Technical Specifications](#technical-specifications)
8. [Risk Assessment](#risk-assessment)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

The document-graph application currently has **~70% of the required infrastructure** to support a first-time lifemap builder flow. The main gaps are:

- **Missing**: First-time user onboarding wizard
- **Missing**: Family name capture and filtering
- **Missing**: Person name extraction and deduplication from documents
- **Missing**: Automatic person node creation from discovered names
- **Partial**: Bulk upload exists but needs family-name-aware person detection

**Estimated Effort:** 3-4 weeks (1 developer)
**Risk Level:** Medium (AI extraction reliability, name disambiguation)
**Architecture Impact:** Low (extends existing patterns, no major refactoring)

---

## Vision Statement

### User Story

> As a **new Lifemap user**, when I first authenticate with Google Drive and have no existing lifemap data, I want to:
>
> 1. Be prompted to enter my **family name** (e.g., "Thebault Family")
> 2. Upload **multiple documents** in bulk (passports, medical records, insurance, etc.)
> 3. Have the system **automatically detect people** from these documents (restricted to family name matches)
> 4. See the system **create person nodes** (level 1), **category nodes** (level 2), and **document nodes** (level 3)
> 5. Have all documents **uploaded to Google Drive** with proper metadata
> 6. End up with a **fully initialized lifemap** ready for use

### Constraints

- **Family name filtering**: Only create person nodes for names matching the provided family name
- **Automatic categorization**: Documents should be categorized (Identity, Health, Finance, etc.) without manual input
- **Non-monolithic architecture**: Services should be decoupled and independently testable
- **Vercel deployment**: Must work within Vercel's serverless constraints (execution time, memory, cold starts)

---

## Current State Analysis

### What Already Exists

#### ✅ Core Infrastructure (Ready to Use)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Google OAuth2 Authentication** | ✅ Complete | `GoogleAuthService` | Handles Drive auth, token refresh |
| **Google Drive Integration** | ✅ Complete | `GoogleDriveService`, `GoogleDriveDataService` | File upload, folder management, metadata sync |
| **Bulk Upload UI** | ✅ Complete | `BulkUploadModal.tsx` | Drag-and-drop, file validation, progress tracking |
| **Document AI Analysis** | ✅ Complete | `documentAnalysisService` + `/api/analyze-document` | OpenAI Vision API, metadata extraction |
| **Intelligent Placement** | ✅ Complete | `documentPlacementService` + `/api/determine-placement` | AI-driven tree location suggestions |
| **Person Folder Structure** | ✅ Complete | `documentOrganizerService` | Creates `/documents/{Person Name}/` folders |
| **Data Model (v2.0)** | ✅ Complete | `standalone-model.ts` | Comprehensive entity/relationship model |
| **Graph Visualization** | ✅ Complete | ReactFlow + D3 radial layout | Interactive tree with expansion |
| **Auto-save** | ✅ Complete | 30-second debounced sync to Drive | Triggered on data changes |
| **Migration System** | ✅ Complete | `DataMigration` class | Converts old data format to new |

#### 🟡 Partial Components (Needs Extension)

| Component | Current State | What's Missing | Gap Size |
|-----------|---------------|----------------|----------|
| **Initialization Flow** | Loads empty data → migrates sample data | Wizard for first-time setup | Medium |
| **Person Detection** | AI infers person from document content | Name extraction + family name filtering | Medium |
| **Entity Creation** | Manual via `AddNodeModal` or placement suggestion | Automatic person node creation | Small |
| **Name Matching** | None | Fuzzy matching, deduplication | Medium |

#### ❌ Missing Components

| Component | Description | Priority | Effort |
|-----------|-------------|----------|--------|
| **Onboarding Wizard** | Multi-step UI for first-time users | High | Medium |
| **Family Name Capture** | Input form + validation | High | Small |
| **Person Name Extractor** | Service to extract names from AI analysis | High | Medium |
| **Name Disambiguation** | Handle "Brett Thebault" vs "B. Thebault" vs "Brett" | Medium | Medium |
| **Bulk Person Creation** | Create multiple person nodes from extracted names | High | Small |
| **Progress Visualization** | Show lifemap building in real-time | Medium | Small |

---

## Gap Analysis

### Gap 1: First-Time User Detection

**Current Behavior:**
```typescript
// googleDriveDataService.ts:60-79
async initialize(): Promise<void> {
  const driveData = await this.loadFromDrive();

  if (driveData) {
    // Load existing lifemap
    this.model = new DocumentGraphModel(driveData);
  } else {
    // Migrate SAMPLE DATA (not user-specific)
    await this.migrateAndSaveInitialData();
  }
}
```

**Problem:** When `driveData` is null (no existing lifemap), the system automatically loads **hardcoded sample data** (Brett, Gemma, Freya, Anya Thebault). There's no prompt for the user to initialize their own family.

**Required Behavior:**
```typescript
async initialize(): Promise<void> {
  const driveData = await this.loadFromDrive();

  if (driveData) {
    // Load existing lifemap
    this.model = new DocumentGraphModel(driveData);
  } else {
    // Trigger ONBOARDING WIZARD
    // 1. Capture family name
    // 2. Launch bulk uploader
    // 3. Detect people from documents
    // 4. Build initial lifemap
    this.triggerOnboardingWizard();
  }
}
```

**Gap Size:** Medium
**Effort:** 3-5 days

---

### Gap 2: Family Name Capture

**Current Behavior:** No family name concept exists in the data model or UI.

**Required:**
- UI component: `FamilyNameForm.tsx`
- Data model field: `metadata.familyName: string` (in `StandaloneDocumentGraph`)
- Validation: Non-empty, reasonable length (2-50 chars)
- Storage: Save to `document-graph.json` metadata

**Example UI:**
```
┌─ Welcome to Lifemap ────────────────────┐
│                                         │
│  Let's get started by setting up your  │
│  family's document library.             │
│                                         │
│  What is your family name?              │
│  ┌─────────────────────────────────┐   │
│  │ Thebault                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancel]              [Continue →]    │
└─────────────────────────────────────────┘
```

**Gap Size:** Small
**Effort:** 1-2 days

---

### Gap 3: Person Name Extraction from Documents

**Current Behavior:**
```typescript
// AI analysis extracts document content but doesn't explicitly identify people
{
  "summary": "The passport for Brett Thebault",
  "documentType": "passport",
  "extractedData": {
    "holder": {
      "name": "Brett Thebault",
      "dateOfBirth": "1985-03-15",
      // ...
    }
  }
}
```

The AI **does extract names**, but they're buried in `extractedData` (which is a flexible JSON structure). There's no standardized way to find person names.

**Required:**
1. **Enhanced AI Prompt** to explicitly identify person names:
   ```typescript
   // api/_lib/openai-client.ts - Update getDocumentAnalysisPrompt()
   return `...

   IMPORTANT: If this document belongs to or references people, extract their full names:

   Return:
   {
     "summary": "...",
     "documentType": "...",
     "extractedData": { ... },
     "confidence": 0-100,
     "personNames": ["Brett Thebault", "Gemma Thebault"]  // NEW FIELD
   }`;
   ```

2. **Person Name Extractor Service** (`personExtractionService.ts`):
   ```typescript
   interface ExtractedPerson {
     fullName: string;           // "Brett Thebault"
     firstName: string;          // "Brett"
     lastName: string;           // "Thebault"
     confidence: number;         // 0-100
     source: string;             // "passport holder"
   }

   class PersonExtractionService {
     extractPeople(
       analysis: DocumentAnalysis,
       familyName: string
     ): ExtractedPerson[] {
       // 1. Check analysis.personNames (if available)
       // 2. Fallback: parse extractedData for name-like fields
       // 3. Filter: only keep people with matching family name
       // 4. Return: normalized person list
     }
   }
   ```

**Gap Size:** Medium
**Effort:** 4-6 days (includes AI prompt tuning and testing)

---

### Gap 4: Name Disambiguation & Deduplication

**Current Behavior:** No handling of name variations.

**Problem:** Documents might contain:
- "Brett Thebault"
- "B. Thebault"
- "Brett"
- "THEBAULT, Brett"
- "Brett Michael Thebault" (middle name)

These should all map to the **same person entity**.

**Required:**
```typescript
// personDeduplicationService.ts
interface PersonCandidate {
  fullName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  confidence: number;
}

class PersonDeduplicationService {
  /**
   * Find matching person entity or return null
   */
  findMatchingPerson(
    candidate: PersonCandidate,
    existingPeople: StandaloneEntity[]
  ): StandaloneEntity | null {
    // Fuzzy matching logic:
    // 1. Exact match (full name, case-insensitive)
    // 2. First + Last name match
    // 3. Initial + Last name match (B. Thebault → Brett Thebault)
    // 4. Levenshtein distance < 2 for typos
  }

  /**
   * Normalize name variations
   */
  normalizeName(name: string): {
    first: string;
    middle?: string;
    last: string;
  } {
    // Handle:
    // - "LAST, First" format
    // - "First Middle Last"
    // - "First M. Last"
    // - Extra whitespace, punctuation
  }
}
```

**Gap Size:** Medium
**Effort:** 5-7 days (fuzzy matching is complex)

---

### Gap 5: Automatic Person Node Creation

**Current Behavior:**
```typescript
// AddNodeModal.tsx - Manual creation only
const handleAdd = () => {
  onAdd({
    type: 'person',
    label: 'New Person',
    description: '',
    level: 1
  });
};
```

**Required:**
```typescript
// personNodeCreationService.ts
class PersonNodeCreationService {
  async createPersonNodes(
    people: ExtractedPerson[],
    model: DocumentGraphModel
  ): Promise<StandaloneEntity[]> {
    const created: StandaloneEntity[] = [];

    for (const person of people) {
      // Check if person already exists
      const existing = deduplicationService.findMatchingPerson(
        person,
        model.getEntities()
      );

      if (existing) {
        created.push(existing);
        continue;
      }

      // Create new person entity
      const entity = model.addEntity({
        type: 'person',
        label: person.fullName,
        description: `Detected from document analysis`,
        level: 1,
        created: new Date().toISOString(),
        createdBy: 'lifemap-builder',
        metadata: {
          detectedFrom: 'document-analysis',
          confidence: person.confidence
        }
      });

      created.push(entity);

      // Create default category folders for this person
      await this.createDefaultCategories(entity, model);
    }

    return created;
  }

  private async createDefaultCategories(
    person: StandaloneEntity,
    model: DocumentGraphModel
  ): Promise<void> {
    const categories = [
      { label: 'Identity', subtype: 'identity' },
      { label: 'Health', subtype: 'health' },
      { label: 'Finance', subtype: 'financial' },
      { label: 'Education', subtype: 'education' },
      { label: 'Insurance', subtype: 'insurance' }
    ];

    for (const cat of categories) {
      model.addEntity({
        type: 'folder',
        subtype: cat.subtype,
        label: cat.label,
        description: `${person.label}'s ${cat.label.toLowerCase()} documents`,
        level: 2,
        parentIds: [person.id],
        ownership: 'individual'
      });
    }
  }
}
```

**Gap Size:** Small (builds on existing patterns)
**Effort:** 2-3 days

---

### Gap 6: Onboarding Wizard UI

**Current Behavior:** No wizard. User sees either:
- Existing lifemap (if authenticated and data exists)
- Sample lifemap (if authenticated but no data)
- Auth screen (if not authenticated)

**Required:**

#### Step 1: Welcome + Family Name

```tsx
// src/components/onboarding/OnboardingWizard.tsx
interface OnboardingWizardProps {
  onComplete: (familyName: string, documents: File[]) => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete
}) => {
  const [step, setStep] = useState<'welcome' | 'family' | 'upload' | 'processing'>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Step 1: Welcome screen
  // Step 2: Family name input
  // Step 3: Bulk document upload
  // Step 4: Processing + progress

  return (
    <div className="onboarding-wizard">
      {step === 'welcome' && <WelcomeStep onNext={() => setStep('family')} />}
      {step === 'family' && (
        <FamilyNameStep
          value={familyName}
          onChange={setFamilyName}
          onNext={() => setStep('upload')}
        />
      )}
      {step === 'upload' && (
        <BulkUploadStep
          files={uploadedFiles}
          onFilesChange={setUploadedFiles}
          onNext={() => setStep('processing')}
        />
      )}
      {step === 'processing' && (
        <ProcessingStep
          familyName={familyName}
          files={uploadedFiles}
          onComplete={onComplete}
        />
      )}
    </div>
  );
};
```

#### Step 2: Bulk Upload (Reuse existing component)

Extend `BulkUploadModal.tsx` to accept a `familyName` prop and pass it to the person extraction service.

#### Step 3: Processing & Progress

```tsx
// src/components/onboarding/ProcessingStep.tsx
interface ProcessingStepProps {
  familyName: string;
  files: File[];
  onComplete: () => void;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  familyName,
  files,
  onComplete
}) => {
  const [progress, setProgress] = useState<ProcessingProgress>({
    phase: 'analyzing',           // analyzing | extracting-people | creating-tree | uploading | complete
    filesProcessed: 0,
    totalFiles: files.length,
    peopleFound: [],
    nodesCreated: 0
  });

  useEffect(() => {
    processFilesAndBuildLifemap();
  }, []);

  async function processFilesAndBuildLifemap() {
    // Phase 1: Analyze all documents
    setProgress({ ...progress, phase: 'analyzing' });
    const analyses = await Promise.all(
      files.map(f => documentAnalysisService.analyzeDocument(f))
    );

    // Phase 2: Extract people from analyses
    setProgress({ ...progress, phase: 'extracting-people' });
    const allPeople = analyses.flatMap(a =>
      personExtractionService.extractPeople(a, familyName)
    );
    const uniquePeople = personDeduplicationService.deduplicate(allPeople);
    setProgress({ ...progress, peopleFound: uniquePeople });

    // Phase 3: Create person nodes and categories
    setProgress({ ...progress, phase: 'creating-tree' });
    const model = dataService.getModel();
    const createdPeople = await personNodeCreationService.createPersonNodes(
      uniquePeople,
      model
    );

    // Phase 4: Place documents in tree and upload to Drive
    setProgress({ ...progress, phase: 'uploading' });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const analysis = analyses[i];

      // Determine placement
      const placement = await documentPlacementService.determineDocumentPlacement(
        analysis,
        model
      );

      // Create document node and upload file
      // ... (existing logic from BulkUploadModal)

      setProgress({ ...progress, filesProcessed: i + 1 });
    }

    // Phase 5: Complete
    setProgress({ ...progress, phase: 'complete' });
    await dataService.saveChanges();
    onComplete();
  }

  return (
    <div className="processing-step">
      <h2>Building Your Lifemap...</h2>

      <ProgressBar
        phase={progress.phase}
        current={progress.filesProcessed}
        total={progress.totalFiles}
      />

      {progress.peopleFound.length > 0 && (
        <div className="people-found">
          <h3>People Detected:</h3>
          <ul>
            {progress.peopleFound.map(p => (
              <li key={p.fullName}>{p.fullName}</li>
            ))}
          </ul>
        </div>
      )}

      <StatusMessage phase={progress.phase} />
    </div>
  );
};
```

**Gap Size:** Large (full UI flow)
**Effort:** 7-10 days

---

## Architecture Considerations

### Design Principles

1. **Service-Oriented:** Each major capability should be a separate service with clear responsibilities
2. **Testable:** Services should be unit-testable without UI dependencies
3. **Vercel-Compatible:** No long-running processes; break work into serverless-friendly chunks
4. **Progressive Enhancement:** System should work even if some AI calls fail
5. **Idempotent:** Re-running the builder should not create duplicates

### Proposed Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ONBOARDING WIZARD (UI)                     │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────┐│
│  │ FamilyNameStep   │→ │ BulkUploadStep │→ │ Processing  ││
│  └──────────────────┘  └────────────────┘  └──────┬──────┘│
└──────────────────────────────────────────────────────┬──────┘
                                                      │
                    ┌─────────────────────────────────┴─────────────────────────────┐
                    │                LIFEMAP BUILDER SERVICE                         │
                    │  Orchestrates: Analysis → Extraction → Dedup → Creation       │
                    └──────────┬────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┬──────────────────────┐
        │                      │                      │                      │
        ▼                      ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Document         │  │ Person           │  │ Person           │  │ Person Node      │
│ Analysis         │  │ Extraction       │  │ Deduplication    │  │ Creation         │
│ Service          │  │ Service          │  │ Service          │  │ Service          │
│                  │  │                  │  │                  │  │                  │
│ (existing)       │  │ (NEW)            │  │ (NEW)            │  │ (NEW)            │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │                     │
         │                     │                     │                     │
         ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT GRAPH MODEL (Data Layer)                        │
│                   - Entities (People, Categories, Documents)                 │
│                   - Relationships                                            │
│                   - Metadata (including familyName)                          │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Google Drive API    │
               │  - Upload documents  │
               │  - Save metadata     │
               └──────────────────────┘
```

### Service Responsibilities

#### 1. **LifemapBuilderService** (NEW - Orchestrator)
```typescript
// src/services/lifemapBuilderService.ts
class LifemapBuilderService {
  async buildFromDocuments(
    familyName: string,
    files: File[],
    progressCallback: (progress: BuildProgress) => void
  ): Promise<BuildResult> {
    // 1. Analyze all documents
    const analyses = await this.analyzeDocuments(files, progressCallback);

    // 2. Extract people from analyses
    const extractedPeople = await this.extractPeople(analyses, familyName, progressCallback);

    // 3. Deduplicate people
    const uniquePeople = await this.deduplicatePeople(extractedPeople, progressCallback);

    // 4. Create person nodes with categories
    const createdPeople = await this.createPersonNodes(uniquePeople, progressCallback);

    // 5. Place documents in tree
    const placedDocuments = await this.placeDocuments(
      files,
      analyses,
      createdPeople,
      progressCallback
    );

    // 6. Upload documents to Drive
    await this.uploadDocuments(placedDocuments, progressCallback);

    // 7. Save metadata
    await this.saveMetadata(familyName);

    return {
      peopleCreated: createdPeople.length,
      documentsPlaced: placedDocuments.length,
      categoriesCreated: createdPeople.length * 5 // 5 default categories per person
    };
  }
}
```

**Responsibilities:**
- Orchestrate the entire flow
- Handle errors and retries
- Report progress
- Ensure idempotency

#### 2. **PersonExtractionService** (NEW)
```typescript
// src/services/personExtractionService.ts
class PersonExtractionService {
  extractPeople(
    analysis: DocumentAnalysis,
    familyName: string
  ): ExtractedPerson[] {
    // Extract person names from analysis
    // Filter by family name
    // Return normalized list
  }

  private matchesFamilyName(fullName: string, familyName: string): boolean {
    // Handle: "Thebault", "thebault", "THEBAULT", "Thébault" (diacritics)
    const normalized = this.normalizeName(familyName).toLowerCase();
    return fullName.toLowerCase().includes(normalized);
  }
}
```

**Responsibilities:**
- Parse `DocumentAnalysis.personNames` and `extractedData`
- Filter by family name
- Normalize name formats
- Return structured person data

#### 3. **PersonDeduplicationService** (NEW)
```typescript
// src/services/personDeduplicationService.ts
class PersonDeduplicationService {
  deduplicate(people: ExtractedPerson[]): ExtractedPerson[] {
    // Group people by similarity
    // Merge duplicates
    // Return unique list
  }

  findMatchingPerson(
    candidate: ExtractedPerson,
    existingPeople: StandaloneEntity[]
  ): StandaloneEntity | null {
    // Fuzzy match against existing entities
  }

  private similarity(name1: string, name2: string): number {
    // Levenshtein distance or similar
  }
}
```

**Responsibilities:**
- Fuzzy name matching
- Duplicate detection
- Confidence scoring
- Merge strategy

#### 4. **PersonNodeCreationService** (NEW)
```typescript
// src/services/personNodeCreationService.ts
class PersonNodeCreationService {
  async createPersonNodes(
    people: ExtractedPerson[],
    model: DocumentGraphModel
  ): Promise<StandaloneEntity[]> {
    // Create person entities
    // Create default category folders
    // Initialize Google Drive folders
  }
}
```

**Responsibilities:**
- Create person entities in data model
- Create default categories (Identity, Health, etc.)
- Initialize Google Drive folder structure
- Handle errors gracefully

### Vercel Deployment Considerations

#### Execution Time Limits
- **Hobby Plan:** 10 seconds
- **Pro Plan:** 60 seconds
- **Enterprise:** 900 seconds

**Problem:** Processing 20 documents could take 3-5 minutes (AI analysis is slow).

**Solution:** Break into smaller operations:
```typescript
// INSTEAD OF: Process all files in one API call
POST /api/build-lifemap
{
  familyName: "Thebault",
  files: [file1, file2, ..., file20]  // ❌ Will timeout
}

// DO: Process files one at a time from client
for (const file of files) {
  await fetch('/api/analyze-document', { file });    // ~5-10 seconds each
}

for (const analysis of analyses) {
  await fetch('/api/determine-placement', { analysis });  // ~2-5 seconds each
}
```

Client-side orchestration keeps each serverless function call under 60 seconds.

#### Cold Starts
- First request after inactivity takes 1-3 seconds longer
- **Mitigation:** Show loading state, set user expectations

#### Memory Limits
- Default: 1024 MB
- **Concern:** Processing large PDFs or images
- **Mitigation:** File size limits (already implemented: 20MB max), image compression

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### Day 1-2: Service Architecture
- [ ] Create `personExtractionService.ts` skeleton
- [ ] Create `personDeduplicationService.ts` skeleton
- [ ] Create `personNodeCreationService.ts` skeleton
- [ ] Create `lifemapBuilderService.ts` orchestrator
- [ ] Add TypeScript interfaces for all new types
- [ ] Unit tests for service interfaces

#### Day 3-4: Person Extraction
- [ ] Update AI prompt to include `personNames` field
- [ ] Implement `extractPeople()` method
- [ ] Add family name filtering logic
- [ ] Handle name normalization (diacritics, case, punctuation)
- [ ] Add fallback extraction from `extractedData`
- [ ] Write unit tests with sample AI responses

#### Day 5: Data Model Updates
- [ ] Add `metadata.familyName` to `StandaloneDocumentGraph`
- [ ] Update migration to preserve/add family name
- [ ] Add `detectedFrom` metadata to entities
- [ ] Update TypeScript types

### Phase 2: Deduplication & Creation (Week 2)

#### Day 6-8: Person Deduplication
- [ ] Implement name normalization (`"LAST, First"` → `{first, last}`)
- [ ] Implement fuzzy matching (Levenshtein distance)
- [ ] Handle edge cases (initials, middle names, typos)
- [ ] Add confidence scoring
- [ ] Write comprehensive unit tests

#### Day 9-10: Person Node Creation
- [ ] Implement `createPersonNodes()` method
- [ ] Create default category folders (Identity, Health, Finance, etc.)
- [ ] Integrate with `documentOrganizerService` for Drive folders
- [ ] Handle creation failures gracefully
- [ ] Write integration tests

### Phase 3: Orchestration (Week 2-3)

#### Day 11-12: Lifemap Builder Service
- [ ] Implement `buildFromDocuments()` orchestrator
- [ ] Add progress reporting (events/callbacks)
- [ ] Add error handling and retries
- [ ] Ensure idempotency (re-running doesn't duplicate)
- [ ] Integration tests with mock services

#### Day 13-14: First-Time Detection
- [ ] Update `GoogleDriveDataService.initialize()` to detect first-time users
- [ ] Add flag: `isFirstTimeUser: boolean`
- [ ] Trigger onboarding wizard instead of sample data migration
- [ ] Add state management for wizard flow

### Phase 4: UI Components (Week 3)

#### Day 15-16: Onboarding Wizard Shell
- [ ] Create `OnboardingWizard.tsx` component
- [ ] Implement step state machine (`welcome` → `family` → `upload` → `processing` → `complete`)
- [ ] Add navigation between steps
- [ ] Add dark mode support
- [ ] Responsive design

#### Day 17: Family Name Step
- [ ] Create `FamilyNameStep.tsx` component
- [ ] Add input validation
- [ ] Add submit handler
- [ ] Styling and UX polish

#### Day 18: Processing Step
- [ ] Create `ProcessingStep.tsx` component
- [ ] Add progress bar (phase-based)
- [ ] Display discovered people
- [ ] Display created nodes count
- [ ] Handle errors and display user-friendly messages

#### Day 19: Integration & Wiring
- [ ] Wire wizard to `GoogleDriveDataService.initialize()`
- [ ] Connect `ProcessingStep` to `LifemapBuilderService`
- [ ] Add loading states
- [ ] Add success/error states

### Phase 5: Testing & Polish (Week 4)

#### Day 20-21: End-to-End Testing
- [ ] Test with real documents (passports, insurance, medical records)
- [ ] Test with various family names (common, uncommon, accents)
- [ ] Test with ambiguous names ("Brett" vs "Brett Thebault")
- [ ] Test with duplicate documents
- [ ] Test error scenarios (AI failures, network issues)

#### Day 22: Performance Optimization
- [ ] Measure AI analysis time per document
- [ ] Optimize batch processing
- [ ] Add request queuing if needed
- [ ] Test cold start performance

#### Day 23: UX Polish
- [ ] Improve loading animations
- [ ] Add helpful hints during processing
- [ ] Add error recovery UI
- [ ] Accessibility audit (keyboard nav, ARIA labels)

#### Day 24: Documentation & Deployment
- [ ] Update README with onboarding flow
- [ ] Add architecture diagram to docs
- [ ] Deploy to Vercel production
- [ ] Monitor error logs

---

## Technical Specifications

### API Changes

#### 1. Enhanced Document Analysis Response

**Current:**
```typescript
interface DocumentAnalysis {
  summary: string;
  documentType: string;
  extractedData: Record<string, any>;
  confidence: number;
}
```

**New:**
```typescript
interface DocumentAnalysis {
  summary: string;
  documentType: string;
  extractedData: Record<string, any>;
  confidence: number;
  personNames?: string[];  // NEW: Explicit person names
}
```

**Implementation:**
```typescript
// api/_lib/openai-client.ts - Update getDocumentAnalysisPrompt()
export function getDocumentAnalysisPrompt(): string {
  return `Analyze this document...

  IMPORTANT: If this document belongs to or references specific people,
  extract their FULL NAMES as an array.

  Return ONLY a raw JSON object:
  {
    "summary": "The [document type] for [person name]",
    "documentType": "classification_here",
    "extractedData": { /* ... */ },
    "confidence": 0-100,
    "personNames": ["Full Name 1", "Full Name 2"]  // Array of full names
  }`;
}
```

#### 2. New Service Interfaces

```typescript
// src/services/personExtractionService.ts
export interface ExtractedPerson {
  fullName: string;           // "Brett Thebault"
  firstName: string;          // "Brett"
  lastName: string;           // "Thebault"
  middleName?: string;        // "Michael" (if present)
  confidence: number;         // 0-100
  source: string;             // "passport holder" | "insurance policy holder" | etc.
  documentId?: string;        // Reference to source document
}

export interface PersonExtractionService {
  extractPeople(
    analysis: DocumentAnalysis,
    familyName: string
  ): ExtractedPerson[];

  normalizeName(name: string): {
    first: string;
    middle?: string;
    last: string;
  };
}
```

```typescript
// src/services/personDeduplicationService.ts
export interface PersonMatch {
  person: StandaloneEntity;
  similarity: number;  // 0-1 (1 = exact match)
  confidence: number;  // 0-100
}

export interface PersonDeduplicationService {
  deduplicate(people: ExtractedPerson[]): ExtractedPerson[];

  findMatchingPerson(
    candidate: ExtractedPerson,
    existingPeople: StandaloneEntity[]
  ): PersonMatch | null;

  similarity(name1: string, name2: string): number;
}
```

```typescript
// src/services/personNodeCreationService.ts
export interface PersonCreationResult {
  person: StandaloneEntity;
  categories: StandaloneEntity[];
  driveFolder: string;
}

export interface PersonNodeCreationService {
  createPersonNodes(
    people: ExtractedPerson[],
    model: DocumentGraphModel
  ): Promise<PersonCreationResult[]>;

  createDefaultCategories(
    person: StandaloneEntity,
    model: DocumentGraphModel
  ): Promise<StandaloneEntity[]>;
}
```

```typescript
// src/services/lifemapBuilderService.ts
export interface BuildProgress {
  phase: 'analyzing' | 'extracting-people' | 'creating-tree' | 'uploading' | 'complete';
  filesProcessed: number;
  totalFiles: number;
  peopleFound: ExtractedPerson[];
  nodesCreated: number;
  currentOperation?: string;  // "Analyzing passport.jpg"
}

export interface BuildResult {
  success: boolean;
  peopleCreated: number;
  documentsPlaced: number;
  categoriesCreated: number;
  errors: string[];
}

export interface LifemapBuilderService {
  buildFromDocuments(
    familyName: string,
    files: File[],
    progressCallback: (progress: BuildProgress) => void
  ): Promise<BuildResult>;
}
```

### Data Model Changes

```typescript
// src/data/standalone-model.ts - Update StandaloneDocumentGraph
export interface StandaloneDocumentGraph {
  graphId: string;
  schema: string;
  metadata: {
    title: string;
    description: string;
    created: string;
    modified: string;
    createdBy: string;
    modifiedBy: string;
    tenant: string;
    version: string;
    familyName?: string;  // NEW: "Thebault", "Smith", etc.
  };
  entities: StandaloneEntity[];
  relationships: StandaloneRelationship[];
  permissions: GraphPermissions;
  changeLog?: ChangeLogEntry[];
  searchIndex?: SearchIndex;
  integrations?: IntegrationConfig;
}
```

### UI Component Structure

```
src/components/onboarding/
├── OnboardingWizard.tsx          # Main wizard container
├── WelcomeStep.tsx               # "Welcome to Lifemap" intro
├── FamilyNameStep.tsx            # Family name input form
├── BulkUploadStep.tsx            # Document upload (reuse BulkUploadModal)
├── ProcessingStep.tsx            # Progress visualization
├── CompleteStep.tsx              # Success message
└── ProgressBar.tsx               # Reusable progress indicator
```

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI extraction inaccuracy** | High | High | Manual review UI, confidence thresholds, fallback to manual entry |
| **Name disambiguation failures** | Medium | Medium | Fuzzy matching, show candidates for user confirmation |
| **Vercel timeout on large batches** | Medium | High | Client-side orchestration, process files sequentially |
| **Cold start latency** | High | Low | Show loading state, set expectations |
| **Google Drive API rate limits** | Low | Medium | Batch uploads, retry with exponential backoff |
| **Memory limits on large files** | Low | Medium | File size validation (already implemented) |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Users upload non-family documents** | Medium | Low | Clear instructions, family name filtering, manual removal option |
| **Ambiguous family names ("Smith")** | Low | Low | Let users manually remove non-family members after initialization |
| **Users skip onboarding** | Low | Medium | Make wizard required for first-time users |
| **Long processing time frustration** | High | Medium | Show progress, estimated time, discovered people preview |

### Business/Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **OpenAI API costs** | High | Medium | Track usage, implement rate limiting, cache results |
| **Privacy concerns (AI analyzing docs)** | Medium | High | Clear privacy policy, server-side processing only, no data retention |
| **Scalability with many concurrent users** | Low | High | Vercel scales automatically, but monitor costs |

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Onboarding Completion Rate** | >80% | (Users who complete wizard) / (Users who start wizard) |
| **Person Detection Accuracy** | >90% | (Correctly detected people) / (Total people) |
| **Person Deduplication Accuracy** | >95% | (Unique people after dedup) / (Expected unique people) |
| **Document Placement Accuracy** | >85% | (Correctly placed documents) / (Total documents) |
| **Average Processing Time per Document** | <30 seconds | From upload to tree placement |
| **Total Onboarding Time (10 documents)** | <5 minutes | From family name input to completion |
| **Error Rate** | <5% | (Failed documents) / (Total documents) |

### Qualitative Metrics

- **User Satisfaction:** Post-onboarding survey (1-5 scale)
- **Ease of Use:** "How easy was it to get started?" (1-5 scale)
- **AI Confidence:** "Did the system correctly identify people and categories?" (Yes/No)

---

## Appendix: Example Flow

### User Story Walkthrough

**Context:** Brett wants to create a lifemap for the Thebault family. He has 15 documents: 4 passports, 3 insurance policies, 4 medical records, 2 bank statements, 2 tax documents.

#### Step 1: Authentication
- Brett opens https://lifemap-six.vercel.app
- Clicks "Sign in with Google"
- Authorizes Google Drive access

#### Step 2: First-Time Detection
- System checks Google Drive `/lifemap-data/data-model/document-graph.json`
- File doesn't exist → `isFirstTimeUser = true`
- System shows `OnboardingWizard` instead of sample data

#### Step 3: Welcome Screen
```
┌─ Welcome to Lifemap ─────────────────────┐
│                                          │
│  Lifemap helps you organize your        │
│  family's important documents in one     │
│  secure, searchable place.               │
│                                          │
│  Let's get started by uploading some     │
│  documents and we'll build your          │
│  family tree automatically.              │
│                                          │
│  [Get Started →]                         │
└──────────────────────────────────────────┘
```

#### Step 4: Family Name Input
```
┌─ What's your family name? ───────────────┐
│                                          │
│  Enter your family last name:            │
│  ┌────────────────────────────────────┐  │
│  │ Thebault                           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ℹ️ We'll only create profiles for      │
│     people with this last name.          │
│                                          │
│  [← Back]                  [Continue →]  │
└──────────────────────────────────────────┘
```

Brett enters "Thebault" and clicks Continue.

#### Step 5: Document Upload
```
┌─ Upload Documents ───────────────────────┐
│                                          │
│  Drag and drop your family's documents   │
│  here, or click to browse.               │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │         📄 Drop files here          ││
│  │                                     ││
│  │      or click to browse files       ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  Supported: PDF, JPEG, PNG (max 20MB)   │
│                                          │
│  [← Back]                  [Continue →]  │
└──────────────────────────────────────────┘
```

Brett drags 15 files into the dropzone. They appear in a list:
```
✓ brett_passport.jpg
✓ gemma_passport.jpg
✓ freya_passport.jpg
✓ anya_passport.jpg
✓ car_insurance.pdf
✓ health_insurance.pdf
✓ life_insurance.pdf
✓ brett_medical_record.pdf
✓ gemma_medical_record.pdf
✓ freya_vaccination.pdf
✓ anya_vaccination.pdf
✓ bank_statement_jan.pdf
✓ bank_statement_feb.pdf
✓ tax_return_2024.pdf
✓ tax_return_2023.pdf
```

Brett clicks "Continue".

#### Step 6: Processing
```
┌─ Building Your Lifemap ──────────────────┐
│                                          │
│  ████████████████░░░░░░░░░░  60%        │
│  Analyzing documents...                  │
│                                          │
│  People Detected:                        │
│  • Brett Thebault                        │
│  • Gemma Thebault                        │
│  • Freya Thebault                        │
│  • Anya Thebault                         │
│                                          │
│  Documents Processed: 9/15               │
│                                          │
│  Current: Analyzing freya_vaccination... │
│                                          │
└──────────────────────────────────────────┘
```

**Behind the Scenes:**

1. **Analyzing Documents (0-40%)**
   ```typescript
   for (const file of files) {
     const analysis = await documentAnalysisService.analyzeDocument(file);
     // Extract: "Brett Thebault" from brett_passport.jpg
     // Extract: "Gemma Thebault" from gemma_passport.jpg
     // etc.
   }
   ```

2. **Extracting People (40-50%)**
   ```typescript
   const allPeople = analyses.flatMap(a =>
     personExtractionService.extractPeople(a, "Thebault")
   );
   // Results:
   // - "Brett Thebault" (from passport + medical + bank)
   // - "Gemma Thebault" (from passport + medical)
   // - "Freya Thebault" (from passport + vaccination)
   // - "Anya Thebault" (from passport + vaccination)
   ```

3. **Deduplicating (50-60%)**
   ```typescript
   const uniquePeople = personDeduplicationService.deduplicate(allPeople);
   // Merge duplicates (e.g., "Brett Thebault" appeared 3 times)
   // Final: 4 unique people
   ```

4. **Creating Tree (60-70%)**
   ```typescript
   const createdPeople = await personNodeCreationService.createPersonNodes(
     uniquePeople,
     model
   );
   // Creates:
   // - Brett (person node, level 1)
   //   ├─ Identity (category, level 2)
   //   ├─ Health (category, level 2)
   //   ├─ Finance (category, level 2)
   //   ├─ Education (category, level 2)
   //   └─ Insurance (category, level 2)
   // - Gemma (+ 5 categories)
   // - Freya (+ 5 categories)
   // - Anya (+ 5 categories)
   // Total: 4 people + 20 categories = 24 nodes
   ```

5. **Placing Documents (70-95%)**
   ```typescript
   for (const { file, analysis } of fileAnalysisPairs) {
     const placement = await documentPlacementService.determineDocumentPlacement(
       analysis,
       model
     );

     // Example placements:
     // brett_passport.jpg → Brett → Identity → Passports
     // car_insurance.pdf → Brett → Insurance → Auto
     // brett_medical_record.pdf → Brett → Health → Medical Records

     const entity = model.addEntity({
       type: 'document',
       label: analysis.summary,
       description: '',
       level: 3,
       parentIds: [placement.parentNodeId],
       documents: [/* file ref */]
     });

     await googleDriveDataService.uploadDocument(file, entity);
   }
   ```

6. **Saving Metadata (95-100%)**
   ```typescript
   await googleDriveDataService.saveChanges();
   // Saves to Google Drive:
   // /lifemap-data/data-model/document-graph.json
   // /lifemap-data/documents/Brett Thebault/
   // /lifemap-data/documents/Gemma Thebault/
   // /lifemap-data/documents/Freya Thebault/
   // /lifemap-data/documents/Anya Thebault/
   ```

#### Step 7: Complete
```
┌─ Your Lifemap is Ready! ─────────────────┐
│                                          │
│  ✓ 4 family members detected             │
│  ✓ 15 documents organized                │
│  ✓ 20 categories created                 │
│                                          │
│  Your family tree:                       │
│  🏠 Thebault Family                      │
│   ├─ 👤 Brett Thebault (8 docs)         │
│   ├─ 👤 Gemma Thebault (4 docs)         │
│   ├─ 👤 Freya Thebault (2 docs)         │
│   └─ 👤 Anya Thebault (1 doc)           │
│                                          │
│  [View Your Lifemap →]                   │
└──────────────────────────────────────────┘
```

Brett clicks "View Your Lifemap" and sees the interactive graph with all nodes and documents properly organized.

---

## Conclusion

The document-graph application has a **strong foundation** for implementing the lifemap builder vision. The main work involves:

1. **Adding person detection services** (extraction, deduplication, creation)
2. **Building the onboarding wizard UI** (family name → upload → processing)
3. **Enhancing AI prompts** to explicitly extract person names
4. **Orchestrating the flow** with the new `LifemapBuilderService`

The architecture remains **non-monolithic** (separate services), works within **Vercel's constraints** (client-side orchestration), and extends **existing patterns** without major refactoring.

**Estimated Timeline:** 3-4 weeks
**Risk Level:** Medium
**Recommended Approach:** Implement in phases (foundation → services → UI → polish)

---

*End of Document*
