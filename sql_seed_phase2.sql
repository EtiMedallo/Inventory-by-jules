-- Insert default pipeline stages for the default organization
DO $$
DECLARE
    default_org UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    INSERT INTO pipeline_stages (organization_id, name, color, stage_order)
    VALUES
        (default_org, 'New Lead', 'blue', 1),
        (default_org, 'Contacted', 'yellow', 2),
        (default_org, 'Qualified', 'purple', 3),
        (default_org, 'Proposal Sent', 'orange', 4),
        (default_org, 'Negotiation', 'pink', 5),
        (default_org, 'Closed Won', 'green', 6),
        (default_org, 'Closed Lost', 'red', 7)
    ON CONFLICT DO NOTHING;
END $$;
