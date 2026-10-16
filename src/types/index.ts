export type RelationshipType = 'romantic' | 'friendship' | 'other';

export type MemoryCategory = 'fact' | 'pattern' | 'interpretation' | 'preference' | 'unresolved';
export type MemoryClassification = 'fact' | 'inference';
export type ConfidenceLevel = 'high' | 'moderate' | 'tentative' | 'unconfirmed';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  themePreference?: 'light' | 'dark' | 'system';
  languagePreference?: 'ar' | 'en';
  aiResponseLanguage?: 'ar_eg' | 'ar_msa' | 'en';
  createdAt: string;
  updatedAt?: string;
}

export interface Relationship {
  id: string;
  userId: string;
  displayName: string;
  relationshipType: RelationshipType;
  status?: string;
  contextDescription?: string;
  summary?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  relationshipId: string;
  title: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MediaType = 'image' | 'video';

export interface MediaAttachment {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: MediaType;
  storagePath: string; // server endpoint /api/media/...
  thumbnailUrl?: string;
  durationSeconds?: number;
  label?: string; // Optional user context e.g. "السناب اللي بعته", "سكرين شوت المحادثة"
  processingStatus: 'ready' | 'processing' | 'failed';
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  analysisType?: string;
  createdAt: string;
  attachments?: MediaAttachment[];
}

export interface MemoryItem {
  id: string;
  relationshipId: string;
  content: string;
  category: MemoryCategory;
  classification: MemoryClassification;
  confidence?: ConfidenceLevel;
  sourceReference?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimelineEvent {
  id: string;
  relationshipId: string;
  eventSummary: string;
  date: string;
  evidenceNotes?: string;
  sourceReference?: string;
  createdAt: string;
}

export interface ReplyOption {
  title: string;
  text: string;
  toneExplanation: string;
  bestFor: string;
}

export interface ReplyResponse {
  options: ReplyOption[];
  advice?: string;
}
