-- Create policies to allow authenticated users to upload to project-floor-plans bucket
CREATE POLICY "Allow authenticated uploads to project-floor-plans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-floor-plans');

-- Create policies to allow authenticated users to upload to lot-media bucket
CREATE POLICY "Allow authenticated uploads to lot-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lot-media');

-- Ensure authenticated users can also select and update their uploaded objects
CREATE POLICY "Allow authenticated read access to project-floor-plans"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-floor-plans');

CREATE POLICY "Allow authenticated read access to lot-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lot-media');

-- Ensure public read access (if not already handled by bucket public status)
CREATE POLICY "Allow public read access to project-floor-plans"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-floor-plans');

CREATE POLICY "Allow public read access to lot-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lot-media');
