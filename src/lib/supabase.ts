import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface DbTicket {
  id: string
  qr_code: string
  status: 'valid' | 'used' | 'invalid'
  validation_date?: string
  validation_count: number
  event_name?: string
  created_at?: string
  updated_at?: string
}

export interface DbValidationHistory {
  id: string
  ticket_id: string
  qr_code: string
  validation_date: string
  event_name: string
  status: string
  created_at?: string
}