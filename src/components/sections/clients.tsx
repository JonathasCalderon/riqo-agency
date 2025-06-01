"use client"

import { useTranslations } from 'next-intl'
import Image from 'next/image'

export function ClientsSection() {
  const t = useTranslations('clients')

  // Client logos
  const clients = [
    {
      name: "CompraFácil S.R.L.",
      logo: "/clients/comprafacil-logo.svg",
      logoLight: "/clients/comprafacil-logo.svg", // Same logo works for both modes
      website: "#", // Add their website URL when available
      description: "Servicios de Distribución"
    }
  ]

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Client Logos Grid */}
        {clients.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center">
            {clients.map((client, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-lg hover:bg-background/50 transition-colors duration-200"
              >
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* Light mode logo */}
                  <Image
                    src={client.logo}
                    alt={client.name}
                    width={120}
                    height={60}
                    className="h-12 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-200 dark:hidden"
                  />
                  {/* Dark mode logo */}
                  <Image
                    src={client.logoLight || client.logo}
                    alt={client.name}
                    width={120}
                    height={60}
                    className="h-12 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-200 hidden dark:block"
                  />
                </a>
              </div>
            ))}
          </div>
        ) : (
          // Placeholder when no clients are added yet
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-lg">
                {t('comingSoon')}
              </p>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            {t('readyToJoin')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              {t('getStartedToday')}
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-background hover:bg-muted transition-colors"
            >
              {t('learnMoreAboutUs')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
