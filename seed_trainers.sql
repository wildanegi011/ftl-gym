DO $$ 
DECLARE 
    user_id_1 UUID := gen_random_uuid();
    user_id_2 UUID := gen_random_uuid();
    user_id_3 UUID := gen_random_uuid();
    user_id_4 UUID := gen_random_uuid();
    spec_bodybuilding UUID := gen_random_uuid();
    spec_strength UUID := gen_random_uuid();
    spec_yoga UUID := gen_random_uuid();
    spec_flexibility UUID := gen_random_uuid();
    spec_hiit UUID := gen_random_uuid();
    spec_cardio UUID := gen_random_uuid();
    spec_pilates UUID := gen_random_uuid();
    spec_core UUID := gen_random_uuid();
BEGIN
    -- Delete old mock trainers from auth.users (cascades to profiles)
    DELETE FROM auth.users WHERE email IN ('pt1@example.com', 'pt2@example.com', 'pt3@example.com', 'pt4@example.com');

    -- Insert into auth.users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
    (user_id_1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pt1@example.com', 'placeholder', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Budi Santoso"}', now(), now()),
    (user_id_2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pt2@example.com', 'placeholder', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Siti Aminah"}', now(), now()),
    (user_id_3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pt3@example.com', 'placeholder', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Reza Rahadian"}', now(), now()),
    (user_id_4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pt4@example.com', 'placeholder', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Anggraeni"}', now(), now());

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES
    (user_id_1, 'Budi Santoso', 'https://images.unsplash.com/photo-1567013127542-490d70d0728c?q=80&w=200&auto=format&fit=crop', 'pt'),
    (user_id_2, 'Siti Aminah', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=200&auto=format&fit=crop', 'pt'),
    (user_id_3, 'Reza Rahadian', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', 'pt'),
    (user_id_4, 'Maya Anggraeni', 'https://images.unsplash.com/photo-1611564494260-5f21fc1ffaf9?q=80&w=200&auto=format&fit=crop', 'pt');

    -- Insert Specialities
    INSERT INTO public.specialities (id, name, description)
    VALUES 
    (spec_bodybuilding, 'Bodybuilding', 'Focus on muscle hypertrophy and aesthetics.'),
    (spec_strength, 'Strength Training', 'Focus on maximizing raw power and lifting heavy.'),
    (spec_yoga, 'Yoga', 'Focus on breathing, flexibility, and mental well-being.'),
    (spec_flexibility, 'Flexibility', 'Improve joint mobility and muscle elasticity.'),
    (spec_hiit, 'HIIT', 'High Intensity Interval Training for maximum fat burn.'),
    (spec_cardio, 'Cardio', 'Cardiovascular endurance training.'),
    (spec_pilates, 'Pilates', 'Low-impact exercise aiming to strengthen muscles while improving postural alignment and flexibility.'),
    (spec_core, 'Core', 'Targeted training for the abdominal and lower back muscles.')
    ON CONFLICT (name) DO NOTHING;

    -- Update speciality UUIDs if they already exist from a previous run to avoid foreign key errors
    SELECT id INTO spec_bodybuilding FROM public.specialities WHERE name = 'Bodybuilding';
    SELECT id INTO spec_strength FROM public.specialities WHERE name = 'Strength Training';
    SELECT id INTO spec_yoga FROM public.specialities WHERE name = 'Yoga';
    SELECT id INTO spec_flexibility FROM public.specialities WHERE name = 'Flexibility';
    SELECT id INTO spec_hiit FROM public.specialities WHERE name = 'HIIT';
    SELECT id INTO spec_cardio FROM public.specialities WHERE name = 'Cardio';
    SELECT id INTO spec_pilates FROM public.specialities WHERE name = 'Pilates';
    SELECT id INTO spec_core FROM public.specialities WHERE name = 'Core';

    -- Insert into public.personal_trainers
    INSERT INTO public.personal_trainers (id, bio, rating, experience_years, certifications)
    VALUES
    (user_id_1, 'Experienced in building muscle mass and powerlifting. I push my clients to their absolute limits to achieve maximum growth.', 4.8, 7, ARRAY['ACE Certified Personal Trainer', 'CrossFit Level 1', 'NASM Weight Loss Specialist']),
    (user_id_2, 'Certified yoga instructor focusing on core and flexibility. Let''s connect your mind, body, and breath.', 4.9, 5, ARRAY['RYT 200 (Yoga Alliance)', 'Pilates Mat Certification']),
    (user_id_3, 'High energy trainer to help you burn fat fast. My HIIT sessions will leave you drenched and energized.', 4.7, 4, ARRAY['ISSA Certified Fitness Trainer', 'TRX Suspension Training Certified']),
    (user_id_4, 'Expert in posture correction and pilates techniques. Transform your daily movement patterns with me.', 5.0, 9, ARRAY['NASM Certified Personal Trainer', 'Corrective Exercise Specialist (CES)', 'Stott Pilates Certified']);

    -- Insert into public.trainer_specialities
    INSERT INTO public.trainer_specialities (trainer_id, speciality_id)
    VALUES
    (user_id_1, spec_bodybuilding),
    (user_id_1, spec_strength),
    (user_id_2, spec_yoga),
    (user_id_2, spec_flexibility),
    (user_id_2, spec_core),
    (user_id_3, spec_hiit),
    (user_id_3, spec_cardio),
    (user_id_4, spec_pilates),
    (user_id_4, spec_core);

    -- Insert into public.pt_session_packages
    INSERT INTO public.pt_session_packages (pt_id, session_count, price, duration_minutes)
    VALUES
    (user_id_1, 1, 150000, 60),
    (user_id_1, 5, 700000, 60),
    (user_id_2, 1, 120000, 60),
    (user_id_2, 5, 550000, 60),
    (user_id_3, 1, 135000, 60),
    (user_id_3, 5, 600000, 60),
    (user_id_4, 1, 125000, 60),
    (user_id_4, 5, 550000, 60);

END $$;
