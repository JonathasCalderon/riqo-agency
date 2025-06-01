"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    company: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('auth')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company: formData.company,
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <Image
                src="/riqo-logo.svg"
                alt="Riqo"
                width={150}
                height={50}
                className="h-12 w-auto mx-auto dark:hidden"
              />
              <Image
                src="/riqo-logo-light.svg"
                alt="Riqo"
                width={150}
                height={50}
                className="h-12 w-auto mx-auto hidden dark:block"
              />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>{t('checkEmail')}</CardTitle>
              <CardDescription>
                {t('emailSent')} {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                {t('emailConfirmDesc')}
              </p>
              <Link href="/auth/signin">
                <Button variant="outline" className="w-full">
                  {t('backToSignIn')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/riqo-logo.svg"
              alt="Riqo"
              width={150}
              height={50}
              className="h-12 w-auto mx-auto dark:hidden"
            />
            <Image
              src="/riqo-logo-light.svg"
              alt="Riqo"
              width={150}
              height={50}
              className="h-12 w-auto mx-auto hidden dark:block"
            />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {t('createAccountTitle')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('signUpDesc')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('signUp')}</CardTitle>
            <CardDescription>
              {t('signUpDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
                  {t('fullName')}
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={t('fullNamePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  {t('emailAddress')}
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                  {t('company')} (Optional)
                </label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={t('companyPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  {t('password')}
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  {t('confirmPassword')}
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('confirmPasswordPlaceholder')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('creatingAccount') : t('signUpButton')}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">
                    {t('alreadyHaveAccount')}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    {t('signInInstead')}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
