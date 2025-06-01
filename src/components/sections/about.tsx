"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Award, Globe } from "lucide-react"
import { useTranslations } from 'next-intl'

export function AboutSection() {
  const t = useTranslations('about')

  const stats = [
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      number: "500+",
      label: t('happyClients')
    },
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      number: "1000+",
      label: t('projectsCompleted')
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      number: "5+",
      label: t('yearsExperience')
    },
    {
      icon: <Globe className="w-8 h-8 text-primary" />,
      number: "25+",
      label: t('countriesServed')
    }
  ]

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              {t('title')}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {t('description1')}
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              {t('description2')}
            </p>

            {/* Mission */}
            <div className="bg-primary/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('mission')}</h3>
              <p className="text-muted-foreground">
                {t('missionDesc')}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center p-6">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stat.number}
                  </div>
                  <div className="text-muted-foreground">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
