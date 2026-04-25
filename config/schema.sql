-- Table: public.leads
-- Stores business leads collected through the Global Business Lead Scanner Platform

CREATE TABLE IF NOT EXISTS public.leads (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    website TEXT,
    industry TEXT,
    city TEXT,
    country TEXT,
    website_quality_score INTEGER DEFAULT 0,
    outreach_status TEXT DEFAULT 'pending'::TEXT,
    status TEXT DEFAULT 'new'::TEXT,
    last_contacted TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads USING btree (status);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads USING btree (industry);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads USING btree (city);
CREATE INDEX IF NOT EXISTS idx_leads_country ON public.leads USING btree (country);
CREATE INDEX IF NOT EXISTS idx_leads_website_quality ON public.leads USING btree (website_quality_score);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON public.leads USING btree (converted);

-- RLS policies (if you want row-level security)
-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy for all users to read leads
CREATE POLICY "Allow read for all authenticated users" ON public.leads
FOR SELECT TO authenticated
USING (true);

-- Policy for inserting leads
CREATE POLICY "Allow insert for all authenticated users" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy for updating leads
CREATE POLICY "Allow update for all authenticated users" ON public.leads
FOR UPDATE TO authenticated
USING (true);

-- Function to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update the 'updated_at' column
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON public.leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a function to get leads by status
CREATE OR REPLACE FUNCTION get_leads_by_status()
RETURNS TABLE(status_value TEXT, count BIGINT)
LANGUAGE sql
AS $$
    SELECT 
        status AS status_value,
        COUNT(*) AS count
    FROM public.leads
    GROUP BY status;
$$;