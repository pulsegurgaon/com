

# PulseGurgaon — Premium News Aggregator

## Overview
A sleek, Medium-inspired news aggregator for Gurgaon/India with real-time news, AI-powered article Q&A, and a full admin dashboard backed by Supabase.

## Design System
- **Primary accent**: Bold crimson `#e11d48` (rose-600)
- **Typography**: Clean sans-serif (Inter) for UI, serif option for article body
- **Light/dark mode** with smooth toggle
- **Smooth transitions** (`duration-200 ease-in-out`) on all interactive elements

## Pages & Components

### 1. Global Components
- **Navbar**: Sticky top bar — "PulseGurgaon" logo (left), nav links [All, India, World, Tech, Finance, Blogs] (center), expandable search icon + dark mode toggle + EN/HI language toggle (right)
- **Mobile bottom nav**: Home, Blogs, Admin, Search icons replacing desktop header
- **Breaking News Ticker**: Slim horizontal scrolling banner below navbar, populated from admin-managed ticker text in Supabase
- **Ad Banner**: Reusable clickable image component with "Sponsored" tag, redirect on click, styled natively

### 2. Homepage (`/`)
- **Hero Section**: Full-width featured article with large image, gradient overlay, bold title — sourced from live news API
- **News Grid**: Responsive masonry grid (1 col mobile → 3 col desktop). Each card: thumbnail, category tag, title, 2-line snippet. Hover: subtle scale + shadow
- **Sidebar** (desktop): "Trending Blogs" vertical list with circular thumbnails and titles, sourced from Supabase blogs table

### 3. Article Detail (`/article/:id`)
- **Layout**: Centered max-width container (Medium-style), no sidebar
- **Hero**: Full-width header image, then H1 title, author/source, date, reading time
- **Key Highlights**: Styled bulleted box at top
- **Content**: Large, high-contrast readable typography
- **AI Q&A Section**: Bottom section — "Ask AI about this article" with text input, send button, "Questions remaining: 5/5" counter, chat bubble UI (iMessage/ChatGPT style). Powered by Lovable AI via Supabase edge function

### 4. Blogs Page (`/blogs`)
- Cinematic card grid with larger cards, glassmorphism text overlays, blur effects — visually distinct from news grid
- Blog data from Supabase `blogs` table

### 5. Admin Dashboard (`/admin`)
- Mock login gate (email/password check against Supabase auth)
- Dark-themed layout with sidebar: Articles, Blogs, Ads, Ticker
- Data tables with Edit/Delete actions
- Modal forms for creating blogs, uploading ad images/links, updating ticker text
- Full CRUD via Supabase tables

## Backend (Supabase / Lovable Cloud)
- **Tables**: `blogs`, `ads`, `ticker_messages`, `articles_cache` (for storing fetched news)
- **Auth**: Supabase auth for admin login
- **Edge Functions**:
  - `ai-article-qa`: Proxies to Lovable AI Gateway with article context, handles streaming responses
  - `fetch-news`: Fetches from a news API (GNews) and caches results
- **RLS**: Admin-only write access, public read

## Live News Integration
- Fetch headlines from GNews API (free tier) via edge function
- Cache articles in Supabase to reduce API calls
- Categories mapped to: India, World, Tech, Finance

## Key Interactions
- Dark/light mode toggle with CSS variable switching
- Search bar expands on click with smooth animation
- Language toggle (EN/HI) switches UI labels
- AI chat with streaming token-by-token responses
- All cards, buttons, links have `transition-all duration-200 ease-in-out`

