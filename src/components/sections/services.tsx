"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, LineChart, PieChart, Activity, FileText, Zap } from "lucide-react"
import { useTranslations } from 'next-intl'

export function ServicesSection() {
  const t = useTranslations('services')

  const services = [
    {
      icon: <Database className="w-8 h-8 text-primary" />,
      title: t('dataIntegration'),
      description: t('dataIntegrationDesc')
    },
    {
      icon: <LineChart className="w-8 h-8 text-primary" />,
      title: t('customDashboards'),
      description: t('customDashboardsDesc')
    },
    {
      icon: <PieChart className="w-8 h-8 text-primary" />,
      title: t('dataVisualization'),
      description: t('dataVisualizationDesc')
    },
    {
      icon: <Activity className="w-8 h-8 text-primary" />,
      title: t('performanceAnalytics'),
      description: t('performanceAnalyticsDesc')
    },
    {
      icon: <FileText className="w-8 h-8 text-primary" />,
      title: t('dataStorytellingService'),
      description: t('dataStorytellingServiceDesc')
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: t('realtimeProcessing'),
      description: t('realtimeProcessingDesc')
    }
  ]

  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  {service.icon}
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
