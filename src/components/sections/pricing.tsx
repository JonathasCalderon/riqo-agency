"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function PricingSection() {
  const t = useTranslations('pricing')

  const plans = [
    {
      name: t('starter'),
      price: t('starterPrice'),
      period: t('starterPeriod'),
      description: t('starterDesc'),
      features: [
        t('features.dataSources3'),
        t('features.dashboards5'),
        t('features.basicVisualizations'),
        t('features.emailSupport'),
        t('features.monthlyRefresh'),
        t('features.standardTemplates')
      ],
      popular: false
    },
    {
      name: t('professional'),
      price: t('professionalPrice'),
      period: t('professionalPeriod'),
      description: t('professionalDesc'),
      features: [
        t('features.dataSources10'),
        t('features.unlimitedDashboards'),
        t('features.advancedVisualizations'),
        t('features.prioritySupport'),
        t('features.realtimeRefresh'),
        t('features.customTemplates'),
        t('features.apiAccess'),
        t('features.teamCollaboration')
      ],
      popular: true
    },
    {
      name: t('enterprise'),
      price: t('enterprisePrice'),
      period: "",
      description: t('enterpriseDesc'),
      features: [
        t('features.unlimitedDataSources'),
        t('features.customIntegrations'),
        t('features.advancedAnalytics'),
        t('features.dedicatedSupport'),
        t('features.onPremiseDeployment'),
        t('features.customDevelopment'),
        t('features.trainingConsulting'),
        t('features.slaGuarantee')
      ],
      popular: false
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
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
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
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
                      <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/auth/signup" className="block">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.name === t('enterprise') ? t('contactSales') : t('getStarted')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            {t('trialNote')}
          </p>
        </div>
      </div>
    </section>
  )
}
