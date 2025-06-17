export type RiskLevel = 'safe' | 'warning' | 'danger';

export interface ScanResult {
  c2paValid: boolean;
  hasLoopArtifacts: boolean;
  emotionScore: number;
  riskLevel: RiskLevel;
  timestamp: string;
  mediaType?: 'image' | 'video';
  c2paDetails?: C2PAResult;
  confidence?: number; // 0-1 confidence score
}

export interface C2PAResult {
  isValid: boolean;
  manifest?: C2PAManifest;
  signer?: string;
  validationStatus: C2PAValidationStatus;
  certificateChain?: C2PACertificate[];
  errors?: string[];
  warnings?: string[];
  signedTimestamp?: string;
  softwareAgent?: string;
  confidenceScore?: number; // 0-100 percentage confidence in authenticity
  trustLevel?: 'high' | 'medium' | 'low'; // Human-readable trust level
}

export interface C2PAManifest {
  claimGenerator?: string;
  title?: string;
  format?: string;
  instanceId?: string;
  timestamp?: string;
  producer?: C2PAProducer;
  assertions?: C2PAAssertion[];
  ingredients?: C2PAIngredient[];
  signature?: C2PASignature;
}

export interface C2PAProducer {
  name?: string;
  identifier?: string;
  credential?: string[];
}

export interface C2PAAssertion {
  label: string;
  data?: any;
  hash?: string;
}

export interface C2PAIngredient {
  title?: string;
  format?: string;
  documentId?: string;
  instanceId?: string;
  relationship?: string;
  hash?: string;
}

export interface C2PASignature {
  algorithm?: string;
  certificate?: string;
  signatureValue?: string;
  timestampInfo?: C2PATimestamp;
}

export interface C2PATimestamp {
  genTime?: string;
  timestampAuthority?: string;
}

export interface C2PACertificate {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  isValid?: boolean;
  isTrusted?: boolean;
  purpose?: string[];
}

export type C2PAValidationStatus = 
  | 'valid'           // Fully valid C2PA manifest with trusted signature
  | 'valid-untrusted' // Valid structure but untrusted/self-signed certificate
  | 'invalid'         // Invalid or corrupted manifest
  | 'missing'         // No C2PA data found
  | 'error';          // Error during validation process

export interface EmotionResult {
  arousalLevel: number; // 0-10 scale
  confidence: number;
}
