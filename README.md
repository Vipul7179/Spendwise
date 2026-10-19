# Hisbo (Spendwise)

Hisbo is a modern, lightweight, privacy-focused Personal Finance Progressive Web App (PWA) built with pure vanilla HTML5, CSS3, and JavaScript, backed by Supabase. It helps individuals and groups track expenses, stay on budget, hit savings goals, and settle shared bills.

---

## Features

- **Dashboard & Spending Analytics**:
  - Interactive SVG visualizations: Donut chart, Pie chart, Horizontal bar breakdown, and Daily histogram with daily spending averages and highest-spend indicator.
  - View by month, week, or drill down into individual days.
- **Budgeting & Smart Alerts**:
  - Monthly category spending limits with threshold alerts at 50%, 80%, 100%, and over-budget states.
  - One-tap alert triggers to open pre-filled WhatsApp or SMS messages.
- **Automated Recurring Deductions**:
  - Automated recurring entries (rent, utilities, subscriptions) logged automatically on the designated day of each month.
- **Savings Goals**:
  - Visual circular progress rings, milestone toasts (25%, 50%, 75%, 100%), and confetti celebration animations.
- **Group Bill Splitting**:
  - Shared expenses for roommates, trips, and friends with exact remainder distribution in paise.
  - Net debt calculations ("who owes whom") and one-tap WhatsApp payment reminders.
- **Smart Import (SMS & CSV)**:
  - Bank SMS parser: Extracts debit amounts, merchants, and dates with keyword-based auto-categorization.
  - Bank statement CSV importer: Supports `DD/MM/YYYY` and `MM/DD/YYYY` formats with intelligent ambiguity detection.
- **Privacy Mode**:
  - Mask all monetary values (`● ● ●`) with a single click or keyboard toggle for privacy in public spaces.
- **Cloud Sync & Guest Mode**:
  - **Guest Mode**: All data is stored purely in client-side `localStorage`—no account required.
  - **Account Mode**: Authenticated cloud synchronization across multiple devices via Supabase.
- **Hisbo Journal (Blog)**:
  - Markdown-rendered articles with category filtering, search, pagination, and dynamic Open Graph / SEO metadata.
- **Admin Promotional Banners**:
  - Interactive carousel banner management with client-side image compression and Supabase Storage uploads.
- **Progressive Web App (PWA)**:
  - Installable on mobile and desktop with offline app-shell caching via Service Worker.

---

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid).
- **Libraries (CDN)**:
  - [Marked.js](https://cdn.jsdelivr.net/npm/marked@15.0.7) (Markdown parsing)
  - [DOMPurify](https://cdn.jsdelivr.net/npm/dompurify@3.2.6) (HTML sanitization)
- **Backend & Auth**: Supabase (PostgreSQL, Auth, Storage, Row-Level Security).
- **Offline / PWA**: Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).

---

## Local Development Setup

No build tools or bundlers are required.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vipul7179/Spendwise.git
   cd Spendwise
   ```

2. **Run a local static server**:
   You can use any local HTTP server:
   - **Node.js**:
     ```bash
     npx serve .
     ```
   - **Python 3**:
     ```bash
     python -m http.server 3000
     ```
   - **VS Code**: Use the *Live Server* extension.

3. **Open the app**:
   Navigate to `http://localhost:3000` (or `http://localhost:5000`) in your browser.

---

## Deployment

Hisbo is a static web application and can be hosted on any static platform (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

### Vercel Deployment
1. Connect your repository to Vercel.
2. If deploying the root folder, keep the default settings:
   - **Framework Preset**: Other
   - **Build Command**: None (leave empty)
   - **Output Directory**: `.` (or `Spendwise` if deployed from a monorepo root)
3. Deploy.

---

## Supabase Prerequisites & Database Schema

The client connects to Supabase using the credentials configured in `index.html`:
```javascript
const SB = 'https://<your-project>.supabase.co';
const SK = '<your-publishable-or-anon-key>';
```

### Required Database Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. User Data (Stores encrypted/structured sync state)
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Users can read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can upsert own data"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Profiles (Admin status & activity tracking)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  last_seen timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by owner or admin"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their last_seen"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Promotional Banners
create table public.banners (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  link_url text,
  image_url text not null,
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "Active banners are publicly viewable"
  on public.banners for select
  using (is_active = true or exists (
    select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true
  ));

create policy "Admins can manage banners"
  on public.banners for all
  using (exists (
    select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true
  ));

-- 4. Blog Categories
create table public.blog_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.blog_categories enable row level security;

create policy "Categories are publicly readable"
  on public.blog_categories for select
  using (true);

-- 5. Blog Posts
create table public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  content text not null default '',
  excerpt text,
  cover_image_url text,
  cover_alt text,
  category_id uuid references public.blog_categories(id) on delete set null,
  status text not null default 'draft', -- 'published' or 'draft'
  published_at timestamptz,
  author_name text default 'Hisbo Team',
  reading_minutes int default 4,
  seo_title text,
  seo_description text,
  og_image_url text,
  noindex boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create policy "Published articles are publicly readable"
  on public.blog_posts for select
  using (status = 'published' and published_at is not null and published_at <= now());

-- Automated Publication & Update Timestamps Trigger
create or replace function public.handle_blog_post_timestamps()
returns trigger as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    if tg_op = 'UPDATE' and old.published_at is not null then
      new.published_at := old.published_at;
    else
      new.published_at := now();
    end if;
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null and new.published_at is null then
    new.published_at := old.published_at;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_blog_posts_timestamps
before insert or update on public.blog_posts
for each row execute function public.handle_blog_post_timestamps();

-- Storage Bucket for Banners
-- In Supabase Storage, create a public bucket named 'banners'.
-- Allow authenticated admins to upload and delete files under 'banners/'.
```

---

## License & Attribution

Designed and developed by **Vipul Singh**.
Distributed for personal financial management. All rights reserved.