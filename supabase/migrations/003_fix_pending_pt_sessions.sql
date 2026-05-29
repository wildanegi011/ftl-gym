-- Fix: Auto-confirm PT sessions that have already been paid but stuck as pending
-- Run this once in Supabase SQL Editor to fix existing data

UPDATE public.pt_sessions s
SET status = 'confirmed'
FROM public.member_pt_packages mpp
WHERE s.member_package_id = mpp.id
  AND mpp.payment_status = 'paid'
  AND s.status = 'pending';
