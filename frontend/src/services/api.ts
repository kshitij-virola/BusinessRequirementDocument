import axios from '../lib/axios';
import { API_ENDPOINTS } from '../config/api';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Thread,
  Message,
  CreateThreadRequest,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateThreadResponse,
  PaginatedResponse,
  ProjectFile,
  Project,
  MCPServerConfig,
} from '../types';

// Auth APIs
export const authAPI = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },
  
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  },
  
  logout: async (refreshToken: string): Promise<void> => {
    await axios.post(API_ENDPOINTS.AUTH.LOGOUT, { refresh: refreshToken });
  },
  
  getProfile: async () => {
    const response = await axios.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },
  
  updateProfile: async (data: { first_name?: string; last_name?: string }) => {
    const response = await axios.patch(API_ENDPOINTS.AUTH.ME, data);
    return response.data;
  },
  
  changePassword: async (data: { old_password: string; new_password: string; new_password_confirm: string }) => {
    const response = await axios.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
    return response.data;
  },
};

// Thread APIs
export const threadAPI = {
  list: async (page: number = 1): Promise<PaginatedResponse<Thread>> => {
    const response = await axios.get(API_ENDPOINTS.THREADS.LIST, {
      params: { page },
    });
    return response.data;
  },
  
  create: async (data: CreateThreadRequest): Promise<CreateThreadResponse> => {
    const formData = new FormData();
    if (data.message) formData.append('message', data.message);
    if (data.mode) formData.append('mode', data.mode);
    if (data.use_prompt_improver !== undefined) {
      formData.append('use_prompt_improver', String(data.use_prompt_improver));
    }
    if (data.images) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }
    
    const response = await axios.post(API_ENDPOINTS.THREADS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  get: async (id: string): Promise<Thread> => {
    const response = await axios.get(API_ENDPOINTS.THREADS.DETAIL(id));
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await axios.delete(API_ENDPOINTS.THREADS.DELETE(id));
  },
};

// Message APIs
export const messageAPI = {
  list: async (threadId: string): Promise<Message[]> => {
    const response = await axios.get(API_ENDPOINTS.MESSAGES.LIST(threadId));
    return response.data;
  },
  
  create: async (threadId: string, data: CreateMessageRequest): Promise<CreateMessageResponse> => {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.mode) formData.append('mode', data.mode);
    if (data.use_prompt_improver !== undefined) {
      formData.append('use_prompt_improver', String(data.use_prompt_improver));
    }
    if (data.images) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }
    
    const response = await axios.post(API_ENDPOINTS.MESSAGES.CREATE(threadId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  get: async (threadId: string, messageId: string): Promise<Message> => {
    const response = await axios.get(API_ENDPOINTS.MESSAGES.DETAIL(threadId, messageId));
    return response.data;
  },
};

// File APIs
export const fileAPI = {
  list: async (threadId: string, page: number = 1, limit?: number): Promise<PaginatedResponse<ProjectFile>> => {
    const response = await axios.get(API_ENDPOINTS.FILES.LIST(threadId), {
      params: { page, ...(limit ? { limit } : {}) },
    });
    return response.data;
  },
  
  get: async (threadId: string, path: string): Promise<ProjectFile> => {
    const response = await axios.get(API_ENDPOINTS.FILES.DETAIL(threadId, path));
    return response.data;
  },
  
  update: async (threadId: string, path: string, content: string): Promise<ProjectFile> => {
    const response = await axios.put(API_ENDPOINTS.FILES.UPDATE(threadId, path), { content });
    return response.data;
  },
};

// Project APIs
export const projectAPI = {
  get: async (id: string): Promise<Project> => {
    const response = await axios.get(API_ENDPOINTS.PROJECTS.DETAIL(id));
    return response.data;
  },
  
  download: async (id: string): Promise<Blob> => {
    const response = await axios.get(API_ENDPOINTS.PROJECTS.DOWNLOAD(id), {
      responseType: 'blob',
    });
    return response.data;
  },
};

// MCP Server APIs
export const mcpAPI = {
  list: async (projectId?: string): Promise<MCPServerConfig[]> => {
    const response = await axios.get(API_ENDPOINTS.MCP.LIST, {
      params: projectId ? { project_id: projectId } : {},
    });
    return response.data;
  },
  
  create: async (data: Partial<MCPServerConfig>): Promise<MCPServerConfig> => {
    const response = await axios.post(API_ENDPOINTS.MCP.CREATE, data);
    return response.data;
  },
  
  get: async (id: string): Promise<MCPServerConfig> => {
    const response = await axios.get(API_ENDPOINTS.MCP.DETAIL(id));
    return response.data;
  },
  
  update: async (id: string, data: Partial<MCPServerConfig>): Promise<MCPServerConfig> => {
    const response = await axios.patch(API_ENDPOINTS.MCP.UPDATE(id), data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await axios.delete(API_ENDPOINTS.MCP.DELETE(id));
  },
  
  test: async (id: string): Promise<{ connected: boolean; tools: unknown[] }> => {
    const response = await axios.post(API_ENDPOINTS.MCP.TEST(id));
    return response.data;
  },
  
  getTools: async (id: string): Promise<unknown[]> => {
    const response = await axios.get(API_ENDPOINTS.MCP.TOOLS(id));
    return response.data;
  },
  
  setupFigma: async (apiKey: string): Promise<MCPServerConfig> => {
    const response = await axios.post(API_ENDPOINTS.MCP.SETUP_FIGMA, { api_key: apiKey });
    return response.data;
  },
};
