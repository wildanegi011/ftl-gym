-- Migration: Storage policies for face_photos bucket
-- Run this in Supabase SQL Editor

-- Make bucket public so face photo URLs are accessible
UPDATE storage.buckets SET public = true WHERE id = 'face_photos';

-- Allow authenticated users to upload face photos
CREATE POLICY "Users can upload own face photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'face_photos');

-- Allow authenticated users to update/replace their face photos
CREATE POLICY "Users can update own face photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'face_photos');

-- Allow public read access (needed for kiosk check-in display)
CREATE POLICY "Public read face photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'face_photos');
