'use server'

import { createClient } from '@/lib/supabase/server'

export async function getTrainers() {
  const supabase = await createClient()

  // We need to fetch from personal_trainers and join with profiles, pt_session_packages, and trainer_specialities.
  const { data, error } = await supabase
    .from('personal_trainers')
    .select(`
      id,
      bio,
      rating,
      experience_years,
      certifications,
      profiles (
        full_name,
        avatar_url
      ),
      pt_session_packages (
        id,
        price,
        session_count,
        duration_minutes
      ),
      trainer_specialities (
        specialities (
          name
        )
      )
    `)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching trainers:', error)
    return []
  }

  // Format the data
  return data.map((pt: any) => {
    // Sort packages by session count
    const packages = pt.pt_session_packages?.sort((a: any, b: any) => a.session_count - b.session_count) || []
    
    return {
      id: pt.id,
      name: pt.profiles?.full_name || 'Unknown',
      avatar_url: pt.profiles?.avatar_url,
      bio: pt.bio,
      rating: pt.rating,
      experience_years: pt.experience_years,
      certifications: pt.certifications || [],
      specialities: pt.trainer_specialities?.map((ts: any) => ts.specialities?.name).filter(Boolean) || [],
      packages: packages,
      // Keep price_per_session for the card preview (use the lowest session count price)
      price_per_session: packages.length > 0 ? packages[0].price : 0
    }
  })
}
