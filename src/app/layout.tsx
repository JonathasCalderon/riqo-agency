import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
