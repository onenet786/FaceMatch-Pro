/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin / Operator' | 'Viewer / Auditor' | 'Mobile App User';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  location?: string;
}

export interface QualityMetrics {
  isClear: boolean;
  isFrontFacing: boolean;
  isMasked: boolean;
  blurScore: number; // 0 (crisp) to 100 (blurry)
  resolution: string;
  confidence: number; // 0 - 100
}

export interface BoundingBox {
  ymin: number; // 0 to 1000
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedFace {
  box: BoundingBox;
  quality: QualityMetrics;
  isValid: boolean;
  rejectReason?: string;
}

export interface Person {
  id: string;
  name: string;
  cnic: string; // ID Number
  phone: string;
  email: string;
  address: string;
  category: string; // 'Employee' | 'Visitor' | 'VIP' | 'Watchlist' | 'Contractor'
  notes: string;
  profileImage: string; // base64 string
  registrationDate: string;
  registeredBy: string;
  status: 'active' | 'disabled';
  consentSigned: boolean;
  faceSampleCount: number;
}

export interface FaceSample {
  id: string;
  personId: string;
  image: string; // base64
  qualityMetrics: QualityMetrics;
  enrolledAt: string;
}

export interface MatchLog {
  id: string;
  timestamp: string;
  matchedPersonId?: string;
  matchedPersonName?: string;
  matchedPersonImage?: string;
  matchedPersonCategory?: string;
  similarityScore: number; // 0 - 100
  confidencePercentage: number; // 0 - 100
  matchStatus: 'Match' | 'Possible Match' | 'No Match' | 'Unknown';
  cameraSource: string;
  operator: string;
  inputImage: string; // base64
}

export interface EnrollmentLog {
  id: string;
  timestamp: string;
  operator: string;
  action: 'Register' | 'Update' | 'Re-enroll' | 'Delete';
  personId: string;
  personName: string;
  details: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  ipAddress: string;
  details: string;
}

export interface WatchlistAlert {
  id: string;
  timestamp: string;
  matchedPersonId: string;
  matchedPersonName: string;
  matchedPersonImage: string;
  similarityScore: number;
  cameraSource: string;
  status: 'Unresolved' | 'Acknowledged' | 'Resolved';
  operatorNotes?: string;
}

export interface SystemSettings {
  similarityThreshold: number; // default 80
  faceDetectionConfidence: number; // default 75
  minResolutionWidth: number; // default 640
  minResolutionHeight: number; // default 480
  rejectBlurry: boolean; // default true
  rejectMasked: boolean; // default true
  dataRetentionDays: number; // default 365 (0 = infinite)
  multiLocationSupport: boolean;
  attendanceMode: boolean;
  selectedCameraId?: string;
  activeBranch: string;
}
