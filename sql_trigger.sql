-- Function to handle new user signups and automatically link them to the default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, organization_id, role, first_name, last_name)
  VALUES (
    new.id,
    '00000000-0000-0000-0000-000000000000', -- Link to default org for MVP
    'org_admin', -- Make them admin of this org initially
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function upon user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
