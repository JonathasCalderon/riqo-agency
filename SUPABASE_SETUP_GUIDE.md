# Riqo Agency - Supabase Setup Guide

This guide will help you set up your Supabase database for the Riqo Agency webapp.

## 📋 Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Riqo Agency Next.js project

## 🚀 Step-by-Step Setup

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `riqo-agency`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (for Bolivia, choose US East or South America)
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

### 2. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire content from `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" message

### 3. Configure Storage Buckets

1. Go to **Storage** in the Supabase dashboard
2. Create the following buckets:

#### Bucket 1: data-uploads
- **Name**: `data-uploads`
- **Public**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `text/csv, application/csv`

#### Bucket 2: dashboard-thumbnails
- **Name**: `dashboard-thumbnails`
- **Public**: ✅ Yes
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/png, image/jpeg, image/webp`

#### Bucket 3: avatars
- **Name**: `avatars`
- **Public**: ✅ Yes
- **File size limit**: 2 MB
- **Allowed MIME types**: `image/png, image/jpeg, image/webp`

### 4. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure the following:

#### Site URL
- **Site URL**: `http://localhost:3000` (for development)
- **Additional redirect URLs**: Add your production domain when ready

#### Email Templates
Customize the email templates for:
- **Confirm signup**
- **Reset password**
- **Magic link**

#### Providers
Enable the authentication providers you want:
- ✅ **Email** (enabled by default)
- Optional: Google, GitHub, etc.

### 5. Set Up Row Level Security Policies

The schema already includes RLS policies, but verify they're active:

1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `profiles` table
   - `data_uploads` table
   - `dashboards` table
   - `api_keys` table
   - `subscription_events` table
   - `usage_analytics` table

### 6. Get Your Project Credentials

1. Go to **Settings** → **API**
2. Copy the following values:

```
Project URL: https://your-project-id.supabase.co
anon public key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
service_role key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### 7. Update Your Environment Variables

Update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🗄️ Database Tables Overview

Your database now includes:

### Core Tables
- **`profiles`** - Extended user information
- **`data_uploads`** - CSV file upload tracking
- **`dashboards`** - Dashboard configurations
- **`dashboard_shares`** - Dashboard sharing permissions

### Business Tables
- **`contact_submissions`** - Contact form submissions
- **`subscription_events`** - Billing and subscription tracking
- **`api_keys`** - API access management
- **`usage_analytics`** - User activity tracking

### Features Enabled
- ✅ **Row Level Security** - Users can only access their own data
- ✅ **Automatic Triggers** - Profile creation, timestamp updates
- ✅ **Performance Indexes** - Optimized queries
- ✅ **Storage Integration** - File upload support

## 🧪 Testing Your Setup

### 1. Test Authentication
1. Start your Next.js app: `npm run dev`
2. Go to `http://localhost:3000/en/auth/signup`
3. Create a test account
4. Check if a profile was created in the `profiles` table

### 2. Test File Upload
1. Sign in to your test account
2. Go to the dashboard
3. Try uploading a CSV file
4. Check the `data_uploads` table for the record

### 3. Test Contact Form
1. Go to the contact section
2. Submit a test message
3. Check the `contact_submissions` table

## 🔧 Advanced Configuration

### Webhooks (Optional)
Set up webhooks for real-time updates:
1. Go to **Database** → **Webhooks**
2. Create webhooks for important events

### Edge Functions (Optional)
For advanced data processing:
1. Go to **Edge Functions**
2. Deploy custom functions for CSV processing

### Realtime (Optional)
Enable real-time subscriptions:
1. Go to **Database** → **Replication**
2. Enable realtime for specific tables

## 🚨 Security Checklist

- ✅ Row Level Security enabled on all tables
- ✅ Proper authentication policies
- ✅ Storage bucket permissions configured
- ✅ Environment variables secured
- ✅ Database password is strong

## 📞 Support

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Review the browser console for errors
3. Verify your environment variables
4. Check the Supabase documentation

## 🎉 You're Ready!

Your Supabase database is now fully configured for the Riqo Agency webapp. You can now:

- ✅ Handle user authentication
- ✅ Store user profiles and preferences
- ✅ Manage CSV file uploads
- ✅ Create and share dashboards
- ✅ Track contact form submissions
- ✅ Monitor usage analytics
- ✅ Manage subscriptions and billing

Happy coding! 🚀
