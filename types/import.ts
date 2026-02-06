export interface ParsedLocation {
  id: string;
  rowNumber: number;
  title: string;
  note?: string;
  url?: string;
  latitude?: number;
  longitude?: number;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isDuplicate: boolean;
}

export interface ValidationError {
  type: string;
  field: string;
  message: string;
  row: number;
}

export interface ValidationWarning {
  type: string;
  field: string;
  message: string;
  row: number;
}

export interface CSVParseResult {
  locations: ParsedLocation[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    fileName: string;
    fileSize: number;
    parsedAt: Date;
  };
}

export interface UploadCSVResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface ImportJob {
  id: string;
  userId: string;
  status: 'CREATED' | 'PARSING' | 'ENRICHING' | 'COMPLETED' | 'FAILED';
  progress: number;
  totalLocations: number;
  processedLocations: number;
  successfulLocations: number;
  failedLocations: number;
  skippedLocations: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
  errors: any[];
  fileName: string;
  fileSize: number;
}

export type ImportStep = 'UPLOAD' | 'PREVIEW' | 'CONFIGURE' | 'PROCESS' | 'COMPLETE';
