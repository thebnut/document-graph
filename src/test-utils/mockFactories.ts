/**
 * Mock Factories
 *
 * Factory functions to create mock objects for testing.
 */

import type { StandaloneEntity, StandaloneRelationship, StandaloneDocumentGraph } from '../data/standalone-model';

/**
 * Create a mock entity with default values
 */
export function createMockEntity(overrides: Partial<StandaloneEntity> = {}): StandaloneEntity {
  const defaults: StandaloneEntity = {
    id: `entity-${Math.random().toString(36).substr(2, 9)}`,
    label: 'Test Entity',
    type: 'person',
    level: 1,
    parentIds: [],
    metadata: {},
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    createdBy: 'test-user',
    modifiedBy: 'test-user',
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock person entity
 */
export function createMockPerson(overrides: Partial<StandaloneEntity> = {}): StandaloneEntity {
  return createMockEntity({
    type: 'person',
    level: 1,
    metadata: {
      dateOfBirth: '1990-01-01',
      relationship: 'self',
    },
    ...overrides,
  });
}

/**
 * Create a mock document entity
 */
export function createMockDocument(overrides: Partial<StandaloneEntity> = {}): StandaloneEntity {
  return createMockEntity({
    type: 'document',
    level: 4,
    metadata: {
      documentType: 'passport',
      expiryDate: '2030-01-01',
    },
    ...overrides,
  });
}

/**
 * Create a mock folder entity
 */
export function createMockFolder(overrides: Partial<StandaloneEntity> = {}): StandaloneEntity {
  return createMockEntity({
    type: 'folder',
    level: 2,
    metadata: {},
    ...overrides,
  });
}

/**
 * Create a mock relationship
 */
export function createMockRelationship(
  overrides: Partial<StandaloneRelationship> = {}
): StandaloneRelationship {
  const defaults: StandaloneRelationship = {
    id: `rel-${Math.random().toString(36).substr(2, 9)}`,
    source: 'entity-1',
    target: 'entity-2',
    type: 'parent-child',
    created: new Date().toISOString(),
    createdBy: 'test-user',
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock document graph with entities and relationships
 */
export function createMockDocumentGraph(
  overrides: Partial<StandaloneDocumentGraph> = {}
): StandaloneDocumentGraph {
  const person = createMockPerson({ id: 'person-1', label: 'Test Person' });
  const folder = createMockFolder({
    id: 'folder-1',
    label: 'Documents',
    parentIds: ['person-1'],
  });
  const document = createMockDocument({
    id: 'doc-1',
    label: 'Test Document',
    parentIds: ['folder-1'],
  });

  const defaults: StandaloneDocumentGraph = {
    id: `graph-${Math.random().toString(36).substr(2, 9)}`,
    version: '2.0.0',
    schema: 'https://lifemap.au/schemas/v2/document-graph.json',
    metadata: {
      title: 'Test Document Graph',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      createdBy: 'test-user',
      modifiedBy: 'test-user',
      tenant: 'test-tenant',
      locale: 'en-US',
    },
    entities: [person, folder, document],
    relationships: [
      createMockRelationship({
        id: 'rel-1',
        source: 'person-1',
        target: 'folder-1',
      }),
      createMockRelationship({
        id: 'rel-2',
        source: 'folder-1',
        target: 'doc-1',
      }),
    ],
    permissions: {
      owners: ['test-user'],
      editors: [],
      viewers: [],
      publicRead: false,
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock File object for testing file uploads
 */
export function createMockFile(
  options: {
    name?: string;
    size?: number;
    type?: string;
    content?: string;
  } = {}
): File {
  const {
    name = 'test-file.pdf',
    size = 1024,
    type = 'application/pdf',
    content = 'test content',
  } = options;

  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Mock file size
  Object.defineProperty(file, 'size', { value: size });

  return file;
}

/**
 * Create a mock Google Drive file metadata
 */
export function createMockGoogleDriveFile(
  overrides: Partial<gapi.client.drive.File> = {}
): gapi.client.drive.File {
  const defaults: gapi.client.drive.File = {
    id: `file-${Math.random().toString(36).substr(2, 9)}`,
    name: 'test-file.pdf',
    mimeType: 'application/pdf',
    createdTime: new Date().toISOString(),
    modifiedTime: new Date().toISOString(),
    parents: ['parent-folder-id'],
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock OpenAI analysis response
 */
export function createMockAIAnalysis(overrides: Partial<any> = {}): any {
  const defaults = {
    summary: 'Test document summary',
    documentType: 'passport',
    extractedData: {
      holder: {
        fullName: 'Test Person',
        dateOfBirth: '1990-01-01',
      },
      document: {
        number: 'ABC123456',
        expiryDate: '2030-01-01',
      },
    },
    confidence: 95,
  };

  return { ...defaults, ...overrides };
}
