"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Play, MessageCircle, Zap } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { DemoRequestModal } from '@/components/demo-request-modal'

export function PricingSection() {
  const t = useTranslations('pricing')
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  const monthlyPlans = [
    {
      name: t('basic'),
      price: t('basicPrice'),
      period: t('basicPeriod'),
      description: t('basicDesc'),
      features: [
        t('features.upTo10Dashboards'),
        t('features.dataStorage500MB'),
        t('features.fileStorage1GB'),
        t('features.minorUpdates')
      ],
      popular: false,
      icon: <Zap className="w-6 h-6" />
    },
    {
      name: t('business'),
      price: t('businessPrice'),
      period: t('businessPeriod'),
      description: t('businessDesc'),
      features: [
        t('features.professionalSupport'),
        t('features.newDashboards5'),
        t('features.contactForMore')
      ],
      popular: true,
      icon: <Zap className="w-6 h-6" />
    }
  ]

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Two-Phase Pricing Explanation */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Phase 1: Initial Development */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <CardTitle className="text-2xl text-primary">{t('phase1Title')}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {t('phase1Subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-foreground mb-2">{t('phase1Price')}</div>
                  <p className="text-muted-foreground">{t('phase1PriceDesc')}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-sm">{t('features.customDashboards')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-sm">{t('features.dataMapping')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-sm">{t('features.visualizationSetup')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-sm">{t('features.initialTraining')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="text-sm">{t('features.dedicatedDatabase')}</span>
                  </li>
                </ul>

                <div className="space-y-3">
                  <Link href="#contact">
                    <Button className="w-full" size="lg">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('requestQuote')}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => setIsDemoModalOpen(true)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {t('requestDemo')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Phase 2: Monthly Subscription */}
            <Card className="border-2 border-secondary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-secondary-foreground">2</span>
                </div>
                <CardTitle className="text-2xl text-secondary-foreground">{t('phase2Title')}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {t('phase2Subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground mb-6">
                  {t('phase2Description')}
                </p>

                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-4">{t('chooseYourPlan')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Monthly Plans */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">{t('monthlyPlansTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {monthlyPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative h-full ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      {t('mostPopular')}
                    </span>
                  </div>
                )}

                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-4">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {t('selectPlan')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-muted/50 rounded-lg p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">{t('readyToStart')}</h3>
            <p className="text-muted-foreground mb-6">{t('readyToStartDesc')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#contact">
                <Button size="lg" className="text-lg px-8">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t('contactUs')}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8"
                onClick={() => setIsDemoModalOpen(true)}
              >
                <Play className="w-5 h-5 mr-2" />
                {t('watchDemo')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Request Modal */}
      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  )
}
