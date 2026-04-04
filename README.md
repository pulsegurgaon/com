# PulseGurgaon

AI-powered news aggregator that fetches news from multiple RSS feeds and enhances them using Groq AI.

## Quick Start

```bash
cd backend
npm install
```

## Environment Variables

Create a `.env` file in the `backend` folder:

```env
PORT=10000
GITHUB_TOKEN=your_github_token
ADMIN_PASSWORD=your_admin_password
GROQ_KEY_1=your_groq_key
GROQ_KEY_2=your_groq_key
# Add more keys if needed
```

## Run

```bash
cd backend
node server.js
```

The server runs on port 10000 (or PORT env var).

## Features

- Auto-fetches news from Times of India, Hindu, BBC, NYTimes, MoneyControl, TechCrunch, The Verge
- Groq AI generates title, summary, timeline, and vocabulary for each article
- Category filtering: India, World, Finance, Technology
- Search functionality
- English/Hindi translation
- Admin panel for managing blogs, breaking ticker, and ads

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=query` | Search articles |
| GET | `/blogs` | Get all blogs |
| POST | `/save-blog` | Add new blog |
| POST | `/save-ticker` | Update breaking ticker |
| GET | `/ticker` | Get current ticker |
| POST | `/save-ads` | Update advertisement |
| GET | `/ads` | Get current ad |
| POST | `/admin` | Verify admin password |

## Project Structure

```
/              - Frontend HTML files
├── index.html       - Main homepage
├── article.html    - Article detail page
├── blog.html       - Blog detail page
├── admin.html      - Admin panel
backend/
├── server.js       - Express server
└── package.json
```

## Deploy

The backend serves static files from the root directory, so deploy the entire folder together.
