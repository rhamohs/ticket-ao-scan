-- Create tickets table
CREATE TABLE public.tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    qr_code TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    security_code TEXT,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'invalid')),
    validation_date TIMESTAMP WITH TIME ZONE,
    validation_count INTEGER NOT NULL DEFAULT 0,
    event_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation_history table
CREATE TABLE public.validation_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    qr_code TEXT NOT NULL,
    name TEXT,
    validation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    event_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) - allowing public access for multi-user validation
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for ticket validation system
CREATE POLICY "Allow public read access to tickets" 
ON public.tickets FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to tickets" 
ON public.tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to tickets" 
ON public.tickets FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to tickets" 
ON public.tickets FOR DELETE USING (true);

CREATE POLICY "Allow public read access to validation_history" 
ON public.validation_history FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to validation_history" 
ON public.validation_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to validation_history" 
ON public.validation_history FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to validation_history" 
ON public.validation_history FOR DELETE USING (true);

-- Enable real-time updates
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.validation_history REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for real-time functionality
ALTER publication supabase_realtime ADD TABLE public.tickets;
ALTER publication supabase_realtime ADD TABLE public.validation_history;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();