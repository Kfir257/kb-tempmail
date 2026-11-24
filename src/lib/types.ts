export type AliasKind = 'plus' | 'dot';

export interface GmailAccount {
  connected: boolean;
  email: string | null;
  local: string | null;
  base: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
}

export interface Alias {
  id: number;
  gmail_address: string;
  alias_address: string;
  match_key: string;
  kind: AliasKind;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  unread: number;
  total: number;
}

export interface Message {
  id: number;
  alias_id: number;
  gmail_id: string;
  to_address: string | null;
  from_name: string | null;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string;
  is_read: boolean;
  body?: string | null;
}

export interface CreatePayload {
  mode: 'auto' | 'plus' | 'dot';
  tag?: string;
  dot_positions?: number[];
  label?: string;
  ttl_hours: number | null;
}

export interface ToastState {
  text: string;
  tone: 'ok' | 'error';
}
