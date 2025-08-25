-- Phase 1: Implement Role-Based Access Control System
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = $1 AND role = $2
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT public.has_role($1, 'admin');
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    );
    
    -- Assign default viewer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at for profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- Create trigger for user_roles updated_at  
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Drop existing overly permissive policies and create secure role-based policies
DROP POLICY IF EXISTS "Authenticated users can view tickets for validation" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can update ticket status" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can import tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can delete tickets" ON public.tickets;

DROP POLICY IF EXISTS "Authenticated users can view validation history" ON public.validation_history;
DROP POLICY IF EXISTS "Authenticated users can create validation records" ON public.validation_history;
DROP POLICY IF EXISTS "Authenticated users can update validation history" ON public.validation_history;
DROP POLICY IF EXISTS "Authenticated users can delete validation history" ON public.validation_history;

-- Secure RLS policies for tickets table
CREATE POLICY "Admins can manage all tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view and validate tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can update ticket status for validation"
ON public.tickets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.is_admin(auth.uid()));

-- Secure RLS policies for validation_history table
CREATE POLICY "Admins can manage all validation history"
ON public.validation_history
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view validation history"
ON public.validation_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can create validation records"
ON public.validation_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.is_admin(auth.uid()));

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));