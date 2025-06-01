"use client"

import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('navigation')

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image
                src="/riqo-logo-light.svg"
                alt="Riqo"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-secondary-foreground/80 mb-6 max-w-md">
              {t('description')}
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4" />
                <span className="text-sm">hello@riqo.agency</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Remote-first, Global reach</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-secondary-foreground mb-4">{t('services')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#services" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  Data Integration
                </Link>
              </li>
              <li>
                <Link href="/#services" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  Custom Dashboards
                </Link>
              </li>
              <li>
                <Link href="/#services" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  Data Visualization
                </Link>
              </li>
              <li>
                <Link href="/#services" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/#services" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  Data Storytelling
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-secondary-foreground mb-4">{t('company')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#about" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  {tNav('about')}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  {tNav('pricing')}
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  {tNav('contact')}
                </Link>
              </li>
              <li>
                <Link href="/auth/signin" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  {tNav('signIn')}
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors">
                  {tNav('getStarted')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-secondary-foreground/60 text-sm">
              {t('allRightsReserved')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-secondary-foreground/60 hover:text-secondary-foreground text-sm transition-colors">
                {t('privacyPolicy')}
              </Link>
              <Link href="/terms" className="text-secondary-foreground/60 hover:text-secondary-foreground text-sm transition-colors">
                {t('termsOfService')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
