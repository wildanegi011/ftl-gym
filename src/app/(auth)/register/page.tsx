import { Suspense } from "react"
import { RegisterWizard } from "@/components/features/auth/RegisterWizard"

// Need searchParams in Server Component:
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const defaultMembership = (params.membership_type as string) || 'basic'

  return (
    <div className="w-full flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Suspense fallback={
        <div className="w-full max-w-5xl mx-auto p-12 flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-sm font-semibold text-zinc-500">Loading wizard...</span>
        </div>
      }>
        <RegisterWizard defaultMembership={defaultMembership} />
      </Suspense>
    </div>
  )
}
