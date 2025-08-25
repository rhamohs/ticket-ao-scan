-- Fix user_roles RLS policies to prevent privilege escalation attacks
-- Drop existing overly broad policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Create specific, secure policies for each operation

-- SELECT: Users can view their own roles, admins can view all roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- INSERT: Only allow system (for new user registration) and admins
-- System functions can insert during user registration due to SECURITY DEFINER
CREATE POLICY "System can create initial user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if it's setting the default viewer role for the user themselves
  (role = 'viewer' AND user_id = auth.uid()) OR
  -- Allow if user is admin (for role assignments)
  public.is_admin(auth.uid())
);

-- UPDATE: Only admins can modify roles
CREATE POLICY "Only admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Only admins can delete role assignments
CREATE POLICY "Only admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Additional security: Create a function to safely assign roles (admin-only)
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, new_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Check if the current user is an admin
  SELECT public.get_user_role(auth.uid()) INTO current_user_role;
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Prevent self-demotion of the last admin
  IF new_role != 'admin' AND target_user_id = auth.uid() THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin';
    END IF;
  END IF;
  
  -- Update or insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- Create a function to revoke user roles (admin-only)
CREATE OR REPLACE FUNCTION public.revoke_user_role(target_user_id UUID, role_to_revoke app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Check if the current user is an admin
  SELECT public.get_user_role(auth.uid()) INTO current_user_role;
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;
  
  -- Prevent removal of the last admin
  IF role_to_revoke = 'admin' AND target_user_id = auth.uid() THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;
  
  -- Delete the role assignment
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = role_to_revoke;
  
  -- If no roles left, assign viewer role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'viewer');
  END IF;
    
  RETURN TRUE;
END;
$$;