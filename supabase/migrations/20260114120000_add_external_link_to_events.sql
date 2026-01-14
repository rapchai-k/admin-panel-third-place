-- Add external_link column to events table
-- This field stores links to external registration platforms like BookMyShow or Ticketmaster
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS external_link TEXT;

COMMENT ON COLUMN public.events.external_link IS 'External link for event registration (e.g., BookMyShow, Ticketmaster)';

