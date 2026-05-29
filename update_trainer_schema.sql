BEGIN;

-- 1. Create specialities master table
CREATE TABLE IF NOT EXISTS public.specialities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for specialities
ALTER TABLE public.specialities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialities are viewable by everyone." ON public.specialities FOR SELECT USING (true);

-- 2. Create trainer_specialities many-to-many table
CREATE TABLE IF NOT EXISTS public.trainer_specialities (
    trainer_id UUID NOT NULL REFERENCES public.personal_trainers(id) ON DELETE CASCADE,
    speciality_id UUID NOT NULL REFERENCES public.specialities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (trainer_id, speciality_id)
);

-- RLS for trainer_specialities
ALTER TABLE public.trainer_specialities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer specialities are viewable by everyone." ON public.trainer_specialities FOR SELECT USING (true);

-- 3. Modify personal_trainers table
ALTER TABLE public.personal_trainers 
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';

-- Remove the old specialization column (if exists)
ALTER TABLE public.personal_trainers DROP COLUMN IF EXISTS specialization;

COMMIT;
