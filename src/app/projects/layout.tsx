import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Home, Building2, User } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">AyP Inventory</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/projects" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700">
            <Building2 className="w-5 h-5 mr-3" />
            Projects
          </Link>
          {/* Future nav items can go here */}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2">
            <User className="w-5 h-5 text-gray-500" />
            <div className="text-sm truncate">
              {user.email}
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button className="flex w-full items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
