// Shapes returned by talentscout-api. Kept in one place so a contract change
// shows up as type errors across the app.

export type Seniority = 'junior' | 'mid' | 'senior' | 'lead';

export interface SearchCriteria {
  titles: string[];
  skills: string[];
  locations: string[];
  seniority: Seniority[];
  minYears: number | null;
  maxYears: number | null;
  includeCompanies: string[];
  excludeCompanies: string[];
  openToWorkOnly: boolean;
}

export interface Credits {
  total: number;
  used: number;
  remaining: number;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  fullName: string;
  credits: Credits;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  searchCount: number;
  shortlistCount: number;
}

export interface Search {
  id: string;
  projectId: string;
  title: string;
  criteria: SearchCriteria;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  searches: Search[];
}

export interface StepInfo {
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  searchId: string;
  role: 'user' | 'assistant';
  content: string;
  meta: { steps?: StepInfo[]; changes?: string[]; total?: number } | null;
  createdAt: string;
}

export interface SearchDetail extends Search {
  messages: ChatMessage[];
}

export interface WorkHistoryItem {
  title: string;
  company: string;
  startYear: number;
  endYear: number;
}

export interface Candidate {
  id: string;
  fullName: string;
  headline: string;
  title: string;
  seniority: Seniority;
  company: string;
  city: string;
  country: string;
  remote: boolean;
  yearsExperience: number;
  skills: string[];
  history: WorkHistoryItem[];
  education: string;
  openToWork: boolean;
}

export interface MatchInfo {
  score: number;
  matched: string[];
  missing: string[];
}

export type EvaluationStatus = 'queued' | 'running' | 'done' | 'failed';
export type Verdict = 'strong' | 'possible' | 'weak';

export interface EvaluationCheck {
  requirement: string;
  status: 'met' | 'partial' | 'missing';
  note: string;
}

export interface Evaluation {
  status: EvaluationStatus;
  score: number | null;
  verdict: Verdict | null;
  checks: EvaluationCheck[];
  updatedAt: string;
}

export interface CandidateResult extends Candidate {
  match: MatchInfo;
  shortlisted: boolean;
  hasSummary: boolean;
  evaluation: Evaluation | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SummaryResponse {
  summary: string;
  charged: boolean;
  credits?: Credits;
}

export interface EvaluationProgress {
  pending: number;
  done: number;
  failed: number;
}

export interface StartEvaluationResponse {
  queued: number;
  skipped: number;
  progress: EvaluationProgress;
}

export interface ShortlistItem {
  candidate: Candidate;
  searchId: string | null;
  addedAt: string;
}

export interface Vocabulary {
  titles: string[];
  skills: string[];
  locations: string[];
  seniority: Seniority[];
  companies: string[];
}

/** One line of the NDJSON chat stream (discriminated union on `type`). */
export type ChatStreamEvent =
  | { type: 'ack'; messageId: string }
  | { type: 'step'; id: string; label: string }
  | { type: 'criteria'; criteria: SearchCriteria; changes: string[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; messageId: string; total: number }
  | { type: 'error'; message: string };

/** Server-Sent Events from /evaluations/stream. */
export type EvaluationStreamEvent =
  | { event: 'snapshot'; data: { progress: EvaluationProgress } }
  | { event: 'evaluation'; data: { candidateId: string; evaluation: Evaluation; progress: EvaluationProgress } };

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}
