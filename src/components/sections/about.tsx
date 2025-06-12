"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"
import { useTranslations } from 'next-intl'

export function AboutSection() {
  const t = useTranslations('about')

  const testimonials = [
    {
      quote: t('testimonial1Quote'),
      author: t('testimonial1Author'),
      role: t('testimonial1Role'),
      company: t('testimonial1Company')
    },
    {
      quote: t('testimonial2Quote'),
      author: t('testimonial2Author'),
      role: t('testimonial2Role'),
      company: t('testimonial2Company')
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

          {/* Testimonials */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-foreground mb-6">{t('testimonialsTitle')}</h3>
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <Quote className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-muted-foreground italic mb-4">
                        "{testimonial.quote}"
                      </p>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role} at {testimonial.company}
                        </p>
                      </div>
                    </div>
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
