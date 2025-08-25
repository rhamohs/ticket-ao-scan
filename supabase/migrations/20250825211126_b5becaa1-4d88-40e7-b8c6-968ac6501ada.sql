-- Fix critical security vulnerability: Ensure explicit denial of public access to sensitive data
-- Use IF NOT EXISTS and conditional drops to avoid conflicts

-- First, check and create explicit denial policies for anonymous users
DO $$
BEGIN
    -- Tickets table: Ensure public access is explicitly denied
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tickets' 
        AND policyname = 'Deny all public access to tickets'
    ) THEN
        CREATE POLICY "Deny all public access to tickets"
        ON public.tickets
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;

    -- Validation history: Ensure public access is explicitly denied
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'validation_history' 
        AND policyname = 'Deny all public access to validation history'
    ) THEN
        CREATE POLICY "Deny all public access to validation history" 
        ON public.validation_history
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;

    -- User roles: Ensure public access is explicitly denied
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND policyname = 'Deny all public access to user roles'
    ) THEN
        CREATE POLICY "Deny all public access to user roles"
        ON public.user_roles
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;

    -- Profiles: Ensure public access is explicitly denied
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Deny all public access to profiles'
    ) THEN
        CREATE POLICY "Deny all public access to profiles"
        ON public.profiles
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;
END
$$;

-- Fix INSERT policy for tickets (only admins should import)
DO $$
BEGIN
    -- Drop existing broad INSERT policies
    DROP POLICY IF EXISTS "Staff can import tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Authenticated users can import tickets" ON public.tickets;
    
    -- Create secure admin-only import policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tickets' 
        AND policyname = 'Only admins can import tickets'
    ) THEN
        CREATE POLICY "Only admins can import tickets"
        ON public.tickets
        FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END
$$;

-- Create audit log table for tracking sensitive data access
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

-- Enable RLS on audit log if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'audit_log' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create audit log policies
DO $$
BEGIN
    -- Only admins can view audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_log' 
        AND policyname = 'Only admins can view audit logs'
    ) THEN
        CREATE POLICY "Only admins can view audit logs"
        ON public.audit_log
        FOR SELECT
        TO authenticated
        USING (public.is_admin(auth.uid()));
    END IF;

    -- System can insert audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_log' 
        AND policyname = 'System can insert audit logs'
    ) THEN
        CREATE POLICY "System can insert audit logs"
        ON public.audit_log
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    -- Deny public access to audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_log' 
        AND policyname = 'Deny public access to audit logs'
    ) THEN
        CREATE POLICY "Deny public access to audit logs"
        ON public.audit_log
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;
END
$$;