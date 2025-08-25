-- Fix critical security vulnerability: Explicitly deny public access to sensitive customer data
-- Add explicit denial policies for anonymous users to prevent data theft

-- Tickets table: Explicitly deny all public access to sensitive customer data
CREATE POLICY "Deny all public access to tickets"
ON public.tickets
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add missing INSERT policy for tickets (only admins should import tickets)
DROP POLICY IF EXISTS "Staff can import tickets" ON public.tickets;
CREATE POLICY "Only admins can import tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Validation history table: Explicitly deny public access to validation records
CREATE POLICY "Deny all public access to validation history" 
ON public.validation_history
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- User roles table: Explicitly deny public access to role information
CREATE POLICY "Deny all public access to user roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Profiles table: Explicitly deny public access to user profiles
CREATE POLICY "Deny all public access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Additional security: Create a function to mask sensitive data for staff users
CREATE OR REPLACE FUNCTION public.get_masked_ticket_info(ticket_qr_code TEXT)
RETURNS TABLE(
  id UUID,
  qr_code TEXT,
  name TEXT,
  masked_email TEXT,
  masked_phone TEXT,
  status TEXT,
  validation_count INTEGER,
  event_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow staff and admin access
  IF NOT (public.has_role(auth.uid(), 'staff') OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges';
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.qr_code,
    t.name,
    CASE 
      WHEN public.is_admin(auth.uid()) THEN t.email
      WHEN t.email IS NOT NULL THEN 
        CONCAT(LEFT(SPLIT_PART(t.email, '@', 1), 2), '***@', SPLIT_PART(t.email, '@', 2))
      ELSE NULL
    END as masked_email,
    CASE 
      WHEN public.is_admin(auth.uid()) THEN t.phone
      WHEN t.phone IS NOT NULL THEN 
        CONCAT(LEFT(t.phone, 3), '***', RIGHT(t.phone, 2))
      ELSE NULL
    END as masked_phone,
    t.status,
    t.validation_count,
    t.event_name
  FROM public.tickets t
  WHERE t.qr_code = ticket_qr_code;
END;
$$;

-- Create audit log for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Deny public access to audit logs
CREATE POLICY "Deny public access to audit logs"
ON public.audit_log
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  action_type TEXT,
  table_name TEXT,
  record_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id)
  VALUES (auth.uid(), action_type, table_name, record_id);
END;
$$;