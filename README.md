# FinCoach AI — Personal Financial Advisor

> AI-powered expense tracker + financial advisor + chatbot built with Next.js 14, Express, MongoDB, and GPT/Claude.

---

## Live Demo
- **Frontend:** `https://fincoach-ai.vercel.app`
- **Backend:** `https://fincoach-api.onrender.com`
- **Demo login:** `demo@fincoach.ai` / `demo1234`

---

## Features

| Feature | Details |
|---|---|
| **Auth** | JWT-based signup/login, persistent sessions |
| **Expense CRUD** | Add, edit, delete expenses with categories |
| **Dashboard** | Stat cards, area chart, donut chart, budget bar |
| **AI Advisor** | Full analysis, saving tips, budget plan |
| **AI Chatbot** | Context-aware finance Q&A with history |
| **Mobile ready** | Fully responsive, sidebar + hamburger menu |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| AI | OpenAI GPT-4o-mini (or Anthropic Claude) |
| Auth | bcryptjs + JWT |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
fincoach-ai/
├── backend/
│   ├── src/
│   │   ├── config/         db.js
│   │   ├── controllers/    authController, expenseController, aiController, statsController
│   │   ├── middleware/      auth.js (JWT protect)
│   │   ├── models/         User, Expense, ChatSession
│   │   ├── routes/         auth, expenses, ai, stats
│   │   ├── services/       aiService.js (OpenAI + Anthropic)
│   │   ├── utils/          seed.js
│   │   └── index.js        Express app entry
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/     login, signup
    │   │   ├── dashboard/
    │   │   ├── expenses/
    │   │   ├── advisor/
    │   │   ├── chat/
    │   │   └── settings/
    │   ├── components/
    │   │   ├── charts/     MonthlyChart, CategoryChart
    │   │   ├── expenses/   ExpenseForm
    │   │   ├── layout/     AppShell, Sidebar
    │   │   └── ui/         StatCard, BudgetBar
    │   ├── contexts/       AuthContext
    │   ├── hooks/          useRequireAuth
    │   └── lib/            api.ts, utils.ts
    ├── .env.example
    └── package.json
```

---

## ⚡ Local Setup (2 steps)

### Step 1 — Backend

```bash
cd backend
cp .env.example .env
# Edit .env: fill in MONGODB_URI and OPENAI_API_KEY (or ANTHROPIC_API_KEY)
npm install
npm run seed        # optional: seed 6 months of demo data
npm run dev         # starts on http://localhost:5000
```

**Required `.env` values:**

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fincoach
JWT_SECRET=change_this_to_random_32_char_string
AI_PROVIDER=openai          # or 'anthropic'
OPENAI_API_KEY=sk-proj-...  # get from platform.openai.com
FRONTEND_URL=http://localhost:3000
```

### Step 2 — Frontend

```bash
cd frontend
cp .env.example .env.local
# .env.local is already correct for local dev
npm install
npm run dev         # starts on http://localhost:3000
```

Open http://localhost:3000 — you're live.

---

## Getting API Keys

### MongoDB Atlas (free tier)
1. Go to https://mongodb.com/atlas and create a free account
2. Create a free M0 cluster
3. Database Access → Add user (password auth)
4. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
5. Connect → Drivers → Copy the connection string
6. Replace `<password>` in your MONGODB_URI

### OpenAI (GPT-4o-mini — cheapest, ~$0.15/1M tokens)
1. Go to https://platform.openai.com
2. API Keys → Create new secret key
3. Paste into `OPENAI_API_KEY`

### Anthropic (alternative)
1. Go to https://console.anthropic.com
2. API Keys → Create key
3. Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=sk-ant-...`
4. `npm install @anthropic-ai/sdk` in backend

---

## Deployment

### Backend → Render (free tier)

1. Push your code to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo → select `backend/` as root directory
4. Configure:
   - **Build command:** `npm install`
   - **Start command:** `node src/index.js`
   - **Node version:** 20
5. Add all environment variables from `.env`
6. Deploy — Render gives you a URL like `https://fincoach-api.onrender.com`

> ⚠️ Free tier spins down after 15 min inactivity. Upgrade for always-on.

### Backend → Railway (alternative, better free tier)

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
railway variables set MONGODB_URI=... JWT_SECRET=... OPENAI_API_KEY=...
```

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel
# Follow prompts — Vercel auto-detects Next.js
```

Or via GitHub:
1. Go to https://vercel.com → Import project → select your repo
2. Set **Root directory** to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com/api`
4. Deploy

---

## REST API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/expenses` | List (filter: category, startDate, endDate, page) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/:id` | Get single expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |

### Stats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats/summary` | Dashboard summary + category breakdown |
| GET | `/api/stats/monthly` | 6-month spending trend |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/analyze` | Full financial analysis |
| POST | `/api/ai/tips` | 5 saving tips |
| POST | `/api/ai/budget-plan` | Personalized budget plan |
| POST | `/api/ai/chat` | Chatbot message (body: {message, sessionId?}) |
| GET | `/api/ai/sessions` | List chat sessions |

All protected endpoints require: `Authorization: Bearer <token>`

---

## Adding More AI Providers

Edit `backend/src/services/aiService.js`:

```js
// To add Google Gemini:
const callGemini = async (systemPrompt, userMessage, history) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // ...
};
```

Then update `callAI()` to route based on `AI_PROVIDER=gemini`.

---

## Common Issues

| Issue | Fix |
|---|---|
| `CORS error` | Set `FRONTEND_URL` in backend `.env` to your Vercel URL |
| `Token expired` | JWT is 7 days — user must log in again |
| `AI timeout` | Increase Express timeout; free OpenAI tier may be slow |
| `MongoDB ECONNREFUSED` | Check Atlas Network Access — allow 0.0.0.0/0 |
| `Cannot find module openai` | Run `npm install` in backend dir |

---

## Extending the App

Ideas to add next:
- **Income tracking** — add an Income model, show savings rate
- **Recurring bills** — auto-add monthly expenses
- **Export to CSV** — download expense history
- **Goal tracker** — set savings goals with progress bars
- **Email reports** — weekly summary via SendGrid
- **Multi-currency** — live exchange rates via ExchangeRate-API
- **Receipt scan** — upload photo → AI extracts expense details

---

## Environment Variables Summary

### Backend `.env`
```
PORT=5000
NODE_ENV=production
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
```

---

Made with care for developers and recruiters. ⚡
