export interface ResearchQuery {
  query: string;
  sessionId?: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  position?: number;
}

export interface AgentResponse {
  answer: string;
  sources: SearchResult[];
  searchQuery: string;
  timestamp: string;
}

export interface AgentConfig {
  maxResults?: number;
  model?: string;
  temperature?: number;
}
