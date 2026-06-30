export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: `${API_V1_URL}/auth/register/`,
    LOGIN: `${API_V1_URL}/auth/login/`,
    LOGOUT: `${API_V1_URL}/auth/logout/`,
    REFRESH: `${API_V1_URL}/auth/token/refresh/`,
    ME: `${API_V1_URL}/auth/me/`,
    CHANGE_PASSWORD: `${API_V1_URL}/auth/change-password/`,
  },
  // Threads
  THREADS: {
    LIST: `${API_V1_URL}/threads/`,
    CREATE: `${API_V1_URL}/threads/`,
    DETAIL: (id: string) => `${API_V1_URL}/threads/${id}/`,
    DELETE: (id: string) => `${API_V1_URL}/threads/${id}/`,
  },
  // Messages
  MESSAGES: {
    LIST: (threadId: string) => `${API_V1_URL}/threads/${threadId}/messages/`,
    CREATE: (threadId: string) => `${API_V1_URL}/threads/${threadId}/messages/`,
    DETAIL: (threadId: string, messageId: string) => 
      `${API_V1_URL}/threads/${threadId}/messages/${messageId}/`,
    STREAM: (threadId: string, messageId: string) => 
      `${API_V1_URL}/threads/${threadId}/messages/${messageId}/stream/`,
  },
  // Files
  FILES: {
    LIST: (threadId: string) => `${API_V1_URL}/threads/${threadId}/files/`,
    DETAIL: (threadId: string, path: string) =>
      `${API_V1_URL}/threads/${threadId}/files/${encodeURIComponent(path)}/`,
    UPDATE: (threadId: string, path: string) =>
      `${API_V1_URL}/threads/${threadId}/files/${encodeURIComponent(path)}/`,
  },
  // Projects
  PROJECTS: {
    DETAIL: (id: string) => `${API_V1_URL}/projects/${id}/`,
    DOWNLOAD: (id: string) => `${API_V1_URL}/projects/${id}/download/`,
  },
  // MCP Servers
  MCP: {
    LIST: `${API_V1_URL}/generation/mcp-servers/`,
    CREATE: `${API_V1_URL}/generation/mcp-servers/`,
    DETAIL: (id: string) => `${API_V1_URL}/generation/mcp-servers/${id}/`,
    UPDATE: (id: string) => `${API_V1_URL}/generation/mcp-servers/${id}/`,
    DELETE: (id: string) => `${API_V1_URL}/generation/mcp-servers/${id}/`,
    TEST: (id: string) => `${API_V1_URL}/generation/mcp-servers/${id}/test/`,
    TOOLS: (id: string) => `${API_V1_URL}/generation/mcp-servers/${id}/tools/`,
    SETUP_FIGMA: `${API_V1_URL}/generation/mcp-servers/setup-figma/`,
  },
} as const;
