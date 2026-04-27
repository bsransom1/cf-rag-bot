/**
 * Shared types across the RAG chatbot app.
 *
 * Keep this module free of runtime imports so it can be safely pulled in
 * from anywhere (server, client, scripts).
 */

/** A single authored FAQ entry (input to the ingestion pipeline). */
export interface FaqEntry {
  question: string;
  /** The authoritative, formal answer. */
  answer: string;
  /** Optional plain-English restatement of the answer. */
  plain_english?: string;
  /** Section label, e.g. "1.1", "1.2". */
  section: string;
  /** Human-friendly category (e.g. "definition", "acquisition"). */
  category: string;
  /** Free-form tags for lightweight filtering / debugging. */
  tags: string[];
}

/** A row stored in Supabase (plus generated id / embedding). */
export interface DocumentRow {
  id: string;
  project_id: string;
  section: string;
  category: string;
  tags: string[];
  question: string;
  answer: string;
  plain_english: string | null;
  /** The text that was actually embedded. */
  content: string;
  embedding: number[];
  created_at: string;
}

/** A retrieved chunk returned by the `match_documents` RPC. */
export interface RetrievedChunk {
  id: string;
  project_id: string;
  section: string;
  category: string;
  tags: string[];
  question: string;
  answer: string;
  plain_english: string | null;
  content: string;
  similarity: number;
}

/** Request body for POST /api/chat. */
export interface ChatRequestBody {
  project_id: string;
  message: string;
  /**
   * Preferred language for the assistant's reply (UI-selected).
   * When omitted, the model mirrors the language of the user message.
   */
  lang?: "en" | "it";
}

/** Response body for POST /api/chat. */
export interface ChatResponseBody {
  response: string;
}
