# Riqo Agency - Data Visualization & Storytelling Platform

Riqo is a modern web application for data visualization and storytelling, built with Next.js 14, Supabase, and Tailwind CSS. The name "Riqo" comes from the Quechua word "riquy" meaning "to see," reflecting our mission to help businesses truly see and understand their data.

## 🌟 Features

- **🌍 Internationalization**: Full English and Spanish support with next-intl
- **🔐 Authentication**: Complete user authentication system with Supabase
- **📊 Dashboard**: User dashboard for CSV file uploads and data management
- **🎨 Modern Design**: Beautiful, responsive design with custom color palette
- **🌙 Dark Mode**: Full dark mode support
- **📱 Mobile-First**: Responsive design that works on all devices
- **🚀 Performance**: Built with Next.js 14 App Router for optimal performance
- **🔒 Security**: Row Level Security (RLS) with Supabase
- **📈 Analytics**: User activity tracking and analytics
- **👥 Client Showcase**: Professional client logos and testimonials

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage)
- **UI Components**: Custom components with Lucide React icons
- **Styling**: Tailwind CSS with custom color palette

## Brand Colors

- **Light**: #F0EBE1 (Background)
- **Dark**: #20231F (Text/Secondary)
- **Call to Action**: #3E92CC (Primary/Accent)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd riqo-agency
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and anon key
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     NEXT_PUBLIC_SITE_URL=http://localhost:3000
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Set up Supabase database**
   - Run the SQL from `supabase-schema.sql` in your Supabase SQL editor
   - Follow the instructions in `SUPABASE_SETUP_GUIDE.md`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication Flow

1. **Sign Up**: Users create accounts with email/password
2. **Email Confirmation**: Supabase sends confirmation emails
3. **Profile Creation**: Automatic profile creation via database triggers
4. **Protected Routes**: Dashboard and user areas require authentication
5. **State Management**: Global auth state with React Context

## 🌍 Internationalization

- **Languages**: English (en) and Spanish (es)
- **Routing**: Automatic locale detection and routing
- **Translations**: Complete UI translations in both languages
- **Fallback**: English as fallback language

## 🎯 Recent Updates

### ✅ Authentication State Management Fixed
- Implemented global auth context with React Context
- Fixed authentication persistence across page refreshes
- Added proper loading states and protected routes
- Updated navigation to show user state correctly

### ✅ Language Support Enhanced
- Added dashboard and sign out translations
- Complete bilingual support for all user interactions
- Language switcher works in all sections

### ✅ Client Showcase Added
- Added CompraFácil client logo to showcase section
- Professional client grid layout
- Ready for additional client logos

## 🚀 Deployment

The app is ready for deployment on platforms like Vercel, Netlify, or Railway.

## 📞 Support

For support, create an issue in this repository.

---

**Built with ❤️ by the Riqo team**
