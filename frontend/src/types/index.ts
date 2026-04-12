/**
 * Shared TypeScript types matching the backend Pydantic schemas.
 */

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Contract {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number | null;
  title: string | null;
  parties: Record<string, unknown> | null;
  effective_date: string | null;
  expiration_date: string | null;
  governing_law: string | null;
  contract_type: string | null;
  overall_risk_score: number | null;
  risk_level: string | null;
  status: "uploaded" | "processing" | "analyzed" | "error";
  summary: string | null;
  raw_text: string | null;
  risk_distribution: RiskDistribution | null;
  created_at: string;
  updated_at: string;
}

export interface ContractListResponse {
  items: Contract[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface Clause {
  id: string;
  contract_id: string;
  clause_index: number;
  clause_text: string;
  clause_type: string | null;
  section_heading: string | null;
  risk_score: number | null;
  risk_level: string | null;
  risk_category: string | null;
  explanation: string | null;
  suggestion: string | null;
  start_char: number | null;
  end_char: number | null;
  metadata_: {
    confidence?: number;
    market_comparison?: string | null;
    impact_if_triggered?: string | null;
    clause_type_detail?: string | null;
  } | null;
  created_at: string;
}

export interface ClauseListResponse {
  clauses: Clause[];
  total: number;
}

export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ContractAnalysisSummary {
  contract_id: string;
  overall_risk_score: number | null;
  risk_level: string | null;
  risk_distribution: RiskDistribution;
  total_clauses: number;
  top_risks: Clause[];
}

export interface ChatMessage {
  id: string;
  contract_id: string;
  role: "user" | "assistant";
  content: string;
  context_clause_ids: string[] | null;
  created_at: string;
}

export interface SearchResult {
  clause_id: string;
  contract_id: string;
  contract_title: string | null;
  clause_text: string;
  clause_type: string | null;
  risk_level: string | null;
  similarity_score: number;
  section_heading: string | null;
}
