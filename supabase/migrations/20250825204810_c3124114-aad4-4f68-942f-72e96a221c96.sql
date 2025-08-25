-- Fix critical security vulnerability: Remove public access to sensitive personal data
-- This will require authentication to be implemented for the app to work

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public delete access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow public insert access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow public read access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow public update access to tickets" ON public.tickets;

DROP POLICY IF EXISTS "Allow public delete access to validation_history" ON public.validation_history;
DROP POLICY IF EXISTS "Allow public insert access to validation_history" ON public.validation_history;
DROP POLICY IF EXISTS "Allow public read access to validation_history" ON public.validation_history;
DROP POLICY IF EXISTS "Allow public update access to validation_history" ON public.validation_history;

-- Create secure RLS policies that require authentication
-- Tickets table - restrict to authenticated users only
CREATE POLICY "Authenticated users can view tickets for validation" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update ticket status" 
ON public.tickets 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can import tickets" 
ON public.tickets 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tickets" 
ON public.tickets 
FOR DELETE 
TO authenticated
USING (true);

-- Validation history table - restrict to authenticated users only
CREATE POLICY "Authenticated users can view validation history" 
ON public.validation_history 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create validation records" 
ON public.validation_history 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update validation history" 
ON public.validation_history 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete validation history" 
ON public.validation_history 
FOR DELETE 
TO authenticated
USING (true);