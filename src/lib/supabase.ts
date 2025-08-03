import { createClient } from '@supabase/supabase-js'

// Use direct Supabase configuration (no env variables needed in Lovable)
const supabaseUrl = 'https://ovwtfvbxfycicxzmeoim.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d3RmdmJ4ZnljaWN4em1lb2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjMzNTgsImV4cCI6MjA2OTc5OTM1OH0.u2vC-iIjPrV-BODr2m3uOGlQgzzydqfn4N9s_pkMNgI'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface DbTicket {
  id: string
  qr_code: string
  name?: string
  email?: string
  phone?: string
  security_code?: string
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
  name?: string
  validation_date: string
  event_name: string
  status: string
  created_at?: string
}