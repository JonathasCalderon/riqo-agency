"use client"

import { Button } from "@/components/ui/button"
import { BarChart3, Eye, TrendingUp } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function HeroSection() {
  const t = useTranslations('hero')

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            {t('title')}
            <span className="text-primary block mt-2">{t('titleHighlight')}</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-6 cursor-pointer">
                {t('startJourney')}
              </Button>
            </Link>
            <Link href="/#services">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 cursor-pointer">
                {t('exploreServices')}
              </Button>
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('visualInsights')}</h3>
              <p className="text-muted-foreground">
                {t('visualInsightsDesc')}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('interactiveDashboards')}</h3>
              <p className="text-muted-foreground">
                {t('interactiveDashboardsDesc')}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('dataStorytelling')}</h3>
              <p className="text-muted-foreground">
                {t('dataStorytellingDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
