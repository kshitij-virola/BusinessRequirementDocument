export type UserRole = 'visitor' | 'user' | 'admin' | 'superadmin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  subscriptionPlan?: 'free' | 'pro' | 'agency'
  creditsRemaining?: number
}

export interface SessionPayload {
  userId: string
  role: UserRole
  expiresAt: Date
}

export type FormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
      }
      message?: string
      success?: boolean
      redirectTo?: string
    }
  | undefined

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalGenerations: number
  creditsRemaining: number
  downloads: number
  subscriptionStatus: string
}

export interface Project {
  id: string
  name: string
  framework: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'archived'
}

export interface Generation {
  id: string
  prompt: string
  framework: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  creditsUsed: number
}

// API Response Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  project?: APIProject | null;
}

export interface Message {
  id: string;
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  mode?: string; // 'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs' | '';
  status: 'pending' | 'generating' | 'completed' | 'error';
  attachments: MessageAttachment[];
  files_changed: string[];
  error_message?: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  original_filename: string;
  storage_path: string;
  mime_type: string;
  width?: number;
  height?: number;
  url: string;
  thumbnails?: {
    '150'?: string;
    '300'?: string;
  };
  uploaded_at: string;
}

export interface APIProject {
  id: string;
  name: string;
  tech_stack: Record<string, unknown>;
  status: 'pending' | 'generating' | 'ready' | 'error';
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  file_type: string;
  version: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  server_type: 'stdio' | 'sse' | 'http';
  connection_params: Record<string, unknown>;
  mcp_library: 'auto' | 'fastmcp' | 'legacy';
  is_active: boolean;
  tools?: unknown[];
}

// Request Types
export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateThreadRequest {
  message?: string;
  images?: File[];
  mode?: string; // 'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs';
  use_prompt_improver?: boolean;
}

export interface CreateMessageRequest {
  content: string;
  images?: File[];
  mode?: string; // 'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs';
  use_prompt_improver?: boolean;
}

export interface CreateMessageResponse {
  user_message: Message;
  assistant_message: Message;
  message_id: string;
}

export interface CreateThreadResponse {
  thread: Thread;
  message_id: string;
}

// SSE Event Types
export type SSEEventType =
  | 'connected'
  | 'status'
  | 'content'
  | 'stage'
  | 'file'
  | 'complete'
  | 'error';

// Live per-agent progress emitted by the multi-agent Studio engine.
export interface StageData {
  index: number;
  total: number;
  node: string;
  agent: string;
  stage: string;
  detail: string;
  state: 'running' | 'done';
}

export interface SSEEvent {
  event: SSEEventType;
  data: unknown;
}

export interface SSEConnectedData {
  thread_id: string;
  message_id: string;
}

// Streaming session status used by the chat store + UI
export type StreamStatus = 'idle' | 'generating' | 'completed' | 'error';

export interface SSEStatusData {
  status: string;
  phase?: string;
}

export interface SSEContentData {
  text: string;
}

export interface SSEFileData {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}

export interface SSECompleteData {
  status: 'success' | 'error';
  files_count?: number;
  project_id?: string;
  message: string;
}

export interface SSEErrorData {
  message: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results?: T[];
  files?: T[];
}

export interface ProjectFilesPaginatedResponse {
  files: ProjectFile[]
  count: number;
  next: string | null;
  previous: string | null;
}
