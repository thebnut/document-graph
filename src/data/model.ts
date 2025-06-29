// Data model interfaces for the Document Graph application

export type EntityType = 'person' | 'pet' | 'asset' | 'document' | 'folder' | 'root';
export type EntitySubtype = 'property' | 'vehicle' | 'financial' | 'legal' | 'medical' | 'insurance' | 'identity' | 'health' | 'education' | 'work' | 'travel';
export type OwnershipType = 'individual' | 'shared';

// Document category types based on the hierarchy
export type DocumentCategory = 
  | 'passport' | 'birth-certificate' | 'drivers-licence' | 'marriage-certificate' | 'visa'
  | 'property-documents' | 'mortgage' | 'insurance' | 'utilities' | 'renovations'
  | 'car-insurance' | 'registration' | 'servicing' 
  | 'gp' | 'condition' | 'hospital-visits' | 'imaging-reports' | 'vaccinations' | 'medicare' | 'private-health-insurance'
  | 'bank-accounts' | 'credit-cards' | 'superannuation' | 'investments' | 'wills-estate'
  | 'tax-returns' | 'ato-correspondence' | 'deductions' | 'accountant-info'
  | 'report-cards' | 'enrolment-details' | 'school-communications' | 'assignments'
  | 'employment-contract' | 'payslips' | 'certifications' | 'business-registrations'
  | 'travel-insurance' | 'flight-confirmations' | 'accommodation-bookings' | 'itineraries'
  | 'vet-visits' | 'pet-insurance' | 'pet-registration'
  | 'streaming-services' | 'phone-plan' | 'internet-plan' | 'memberships';

// Specific metadata interfaces for different document types
export interface PassportMetadata {
  passportNumber?: string;
  expiryDate?: string;
  country?: string;
  isPrimary?: boolean;
}

export interface DriverLicenceMetadata {
  licenceNumber?: string;
  expiryDate?: string;
  class?: string;
  stateIssued?: string;
}

export interface VehicleMetadata {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  registrationNumber?: string;
  purchaseDate?: string;
}

export interface PropertyMetadata {
  address?: string;
  titleNumber?: string;
  lotPlan?: string;
  purchaseDate?: string;
  purchasePrice?: number;
}

export interface HealthMetadata {
  clinic?: string;
  doctorName?: string;
  date?: string;
  type?: string;
  notes?: string;
}

export interface FinancialMetadata {
  bank?: string;
  accountNumber?: string;
  accountType?: string;
  bsb?: string;
  balance?: number;
}

export interface InsuranceMetadata {
  provider?: string;
  policyNumber?: string;
  coverageType?: string;
  expiryDate?: string;
  premium?: number;
}

export interface Entity {
  id: string;
  label: string;
  type: EntityType;
  subtype?: EntitySubtype;
  category?: DocumentCategory;
  description?: string;
  expiry?: string;
  source?: string;
  level: number;
  parentIds?: string[];
  hasChildren?: boolean;
  ownership?: OwnershipType;
  // Document reference fields
  documentPath?: string;
  documentType?: 'image' | 'pdf' | 'other';
  documentMetadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    uploadDate?: string;
    [key: string]: any;
  };
  // Type-specific metadata
  metadata?: PassportMetadata | DriverLicenceMetadata | VehicleMetadata | 
             PropertyMetadata | HealthMetadata | FinancialMetadata | 
             InsuranceMetadata | Record<string, any>;
}

export interface EntityRelationship {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface DocumentGraphModel {
  version: string;
  metadata: {
    created: string;
    modified: string;
    description?: string;
  };
  entities: Entity[];
  relationships: EntityRelationship[];
}

// Helper type for entity with computed properties
export interface EntityWithComputed extends Entity {
  isExpanded?: boolean;
  isManuallyPositioned?: boolean;
  isVirtual?: boolean;
  hideInView?: boolean;
}