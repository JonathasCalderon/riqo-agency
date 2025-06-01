"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu, X, Globe, User, LogOut } from "lucide-react"
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/routing'
import { useAuth } from '@/lib/auth/auth-context'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const t = useTranslations('navigation')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'es' : 'en'
    router.push(pathname, { locale: newLocale })
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            {/* Desktop Logo - Light Mode */}
            <Image
              src="/riqo-logo.svg"
              alt="Riqo"
              width={250}
              height={120}
              className="h-16 w-auto hidden sm:block dark:hidden"
            />
            {/* Desktop Logo - Dark Mode */}
            <Image
              src="/riqo-logo-light.svg"
              alt="Riqo"
              width={250}
              height={120}
              className="h-16 w-auto hidden sm:dark:block"
            />
            {/* Mobile Logo - Light Mode */}
            <Image
              src="/riqo-logo-simple.svg"
              alt="Riqo"
              width={40}
              height={40}
              className="h-10 w-10 sm:hidden dark:hidden"
            />
            {/* Mobile Logo - Dark Mode */}
            <Image
              src="/riqo-logo-simple-light.svg"
              alt="Riqo"
              width={40}
              height={40}
              className="h-10 w-10 sm:hidden dark:block"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/#services" className="text-foreground hover:text-primary transition-colors">
              {t('services')}
            </Link>
            <Link href="/#pricing" className="text-foreground hover:text-primary transition-colors">
              {t('pricing')}
            </Link>
            <Link href="/#about" className="text-foreground hover:text-primary transition-colors">
              {t('about')}
            </Link>
            <Link href="/#contact" className="text-foreground hover:text-primary transition-colors">
              {t('contact')}
            </Link>
          </div>

          {/* Auth Buttons & Language Switcher */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-sm"
            >
              <Globe className="w-4 h-4 mr-1" />
              {locale === 'en' ? 'ES' : 'EN'}
            </Button>

            {loading ? (
              <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              // Authenticated user menu
              <div className="flex items-center space-x-2">
                <Link href="/dashboard">
                  <Button variant="ghost">
                    <User className="w-4 h-4 mr-2" />
                    {t('dashboard')}
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('signOut')}
                </Button>
              </div>
            ) : (
              // Non-authenticated user buttons
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost">{t('signIn')}</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>{t('getStarted')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-xs"
            >
              {locale === 'en' ? 'ES' : 'EN'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border">
              <Link
                href="/#services"
                className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('services')}
              </Link>
              <Link
                href="/#pricing"
                className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('pricing')}
              </Link>
              <Link
                href="/#about"
                className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('about')}
              </Link>
              <Link
                href="/#contact"
                className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('contact')}
              </Link>
              <div className="flex flex-col space-y-2 px-3 py-2">
                {loading ? (
                  <div className="w-full h-9 bg-muted animate-pulse rounded-md" />
                ) : user ? (
                  // Authenticated user mobile menu
                  <>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="w-4 h-4 mr-2" />
                        {t('dashboard')}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('signOut')}
                    </Button>
                  </>
                ) : (
                  // Non-authenticated user mobile menu
                  <>
                    <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        {t('signIn')}
                      </Button>
                    </Link>
                    <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full">{t('getStarted')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
