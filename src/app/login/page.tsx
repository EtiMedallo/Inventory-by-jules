'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoadingAction('login')
    setError(null)

    if (!email || !password) {
      setError("Email and password are required")
      setLoadingAction(null)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoadingAction(null)
    } else {
      router.push('/projects')
      router.refresh()
    }
  }

  const handleSignup = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoadingAction('signup')
    setError(null)

    if (!email || !password) {
      setError("Email and password are required")
      setLoadingAction(null)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoadingAction(null)
    } else {
      // If email confirmation is off, data.session should be present.
      if (data.session) {
        router.push('/projects')
        router.refresh()
      } else {
        // If email confirmation is ON, notify user
        setError("Account created. Please check your email to verify your account.")
        setLoadingAction(null)
      }
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            AyP Inventory
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Welcome back! Please enter your details.
          </p>
        </div>

        <form className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={loadingAction !== null}
              className="flex w-full justify-center items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loadingAction === 'login' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
            </button>
            <button
              onClick={handleSignup}
              disabled={loadingAction !== null}
              className="flex w-full justify-center items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loadingAction === 'signup' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
