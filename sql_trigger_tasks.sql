-- Function to automatically generate tasks when a lead enters a new stage
CREATE OR REPLACE FUNCTION generate_lead_tasks()
RETURNS TRIGGER AS $$
DECLARE
    cadence_record RECORD;
BEGIN
    -- Only run if stage changed or if it's a new lead
    IF (TG_OP = 'INSERT') OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN

        -- First, cancel any pending tasks for the old stage
        IF (TG_OP = 'UPDATE') THEN
            UPDATE lead_tasks
            SET status = 'cancelled'
            WHERE lead_id = NEW.id AND status = 'pending';
        END IF;

        -- Loop through cadences for the new stage
        FOR cadence_record IN
            SELECT * FROM sales_cadences
            WHERE stage_id = NEW.stage_id AND organization_id = NEW.organization_id
        LOOP
            INSERT INTO lead_tasks (
                organization_id,
                lead_id,
                assigned_to,
                action_type,
                template_text,
                due_date
            ) VALUES (
                NEW.organization_id,
                NEW.id,
                NEW.assigned_to, -- Will assign to the commercial handling the lead
                cadence_record.action_type,
                cadence_record.template_text,
                -- Simple date addition (ignoring weekends/holidays for MVP)
                CURRENT_DATE + (cadence_record.day_number || ' days')::interval
            );
        END LOOP;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_generate_lead_tasks
AFTER INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE PROCEDURE generate_lead_tasks();
