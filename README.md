# SASTracker

A question paper archive and resume sharing platform for SASTRA University students.

## What it does

SASTracker has two main features:

**Previous Year Questions (PyQ)**
- Browse and search through past exam questions
- Filter by year, subject, exam type, and marks
- Group questions however you want
- View AI-generated solutions for questions
- Rate questions by difficulty
- Full LaTeX rendering for math content

**Resume Hub**
- Upload and share your resume
- Fork other approved resumes as templates
- Compare two resumes side by side with the diff viewer
- Designate one resume as your flagship
- Browse approved resumes from other students

## Tech Stack

- Next.js 16 with React 19
- Supabase for auth and database
- Python/FastAPI backend for AI features
- TailwindCSS with DaisyUI
- TipTap for rich text editing
- KaTeX for math rendering

## Requirements

- Node.js 18 or higher
- A Supabase project
- Python 3.10+ for the backend

## Setup

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies:
   ```
   npm install
   cd backend && pip install -r requirements.txt
   ```
4. Run the development server:
   ```
   npm run dev
   ```
5. Run the backend:
   ```
   cd backend && python main.py
   ```

## Project Structure

```
sastracker/
  app/             - Next.js pages and routes
    admin/         - Admin dashboard
    auth/          - Login/signup
    dashboard/     - User dashboard
    profile/       - User profiles
    projects/      - Project showcase
    question/      - Question detail pages
    resumes/       - Resume hub, fork, diff
    upload/        - File upload
  backend/         - Python backend for AI solutions
  components/      - Shared React components
  utils/           - Helper functions
  supabase/        - Database migrations
```

## Access Control

- SASTRA email required for PyQ features
- Non-SASTRA users can only access the resume hub
- Admin panel restricted to approved domains

---