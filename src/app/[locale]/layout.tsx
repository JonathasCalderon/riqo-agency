import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import { AuthProvider } from '@/lib/auth/auth-context';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Riqo - Data Visualization & Storytelling Agency",
  description: "Transform your data into compelling visual stories with Riqo's expert data visualization and analytics services.",
  keywords: ["data visualization", "analytics", "dashboards", "business intelligence", "data storytelling"],
  authors: [{ name: "Riqo Agency" }],
  icons: {
    icon: "/riqo-logo-simple.ico",
    shortcut: "/riqo-logo-simple.ico",
    apple: "/riqo-logo-simple.ico",
  },
  openGraph: {
    title: "Riqo - Data Visualization & Storytelling Agency",
    description: "Transform your data into compelling visual stories with Riqo's expert data visualization and analytics services.",
    type: "website",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
