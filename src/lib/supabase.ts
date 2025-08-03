import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment or default values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create a function to initialize Supabase client
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using fallback configuration.')
    // Return a mock client for development when Supabase isn't configured
    return null
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient()

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