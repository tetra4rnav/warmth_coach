# Warmth Coach

Warmth Coach is a Next.js (App Router) MVP that helps users practice warm, curious conversation. Users role-play with an AI partner while an AI coach scores each user message and suggests rewrites. At the end of a session, a review highlights three cold moments and a focused practice objective.

## Features
- **Scenarios**: first meeting small talk, date/getting to know someone, classmate/colleague chat.
- **Streaming partner**: partner responses stream via SSE.
- **Coach panel**: warmth, curiosity, empathy scores with evidence and rewrite options.
- **Preflight rewrites**: preview coach suggestions before sending.
- **Session review**: three cold moments + one practice objective.
- **Supabase**: auth + database + RLS policies.

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + DB)
- LLM API via OpenAI-compatible Chat Completions (fetch-based)

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
Copy `.env.example` and fill values:
```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY`

Optional:
- `LLM_BASE_URL` (defaults to OpenAI-compatible endpoint)
- `LLM_MODEL` (defaults to `gpt-4.1-mini`)

### 3) Apply database schema
Use the SQL in `supabase/schema.sql` inside the Supabase SQL editor.

### 4) Run the app
```bash
npm run dev
```

Visit `http://localhost:3000`.


## Deploy to Heroku (GitHub連携)

このリポジトリは `Procfile` と `app.json` を含んでおり、HerokuのNode.js buildpackでそのままデプロイできます。

### 1) Herokuアプリ作成
- Heroku Dashboard → **New** → **Create new app**
- Regionを選択して作成

### 2) GitHub連携
- アプリ画面の **Deploy** タブ → **Deployment method: GitHub**
- 対象リポジトリを接続
- 必要なら **Enable Automatic Deploys** をON

### 3) Config Vars設定
Herokuアプリの **Settings** → **Config Vars** に以下を設定:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY`
- `LLM_BASE_URL` (未設定なら `https://api.openai.com/v1`)
- `LLM_MODEL` (例: `gpt-4.1-mini`)
- `DEV_BYPASS_AUTH=false`
- `NEXT_PUBLIC_DEV_BYPASS_AUTH=false`

> Herokuでは本番用途のため、dev bypass authは必ず`false`にしてください。

### 4) 初回デプロイ
- **Deploy Branch** を実行（またはmainへpush）
- `heroku-postbuild` で `next build` が走り、`web: npm run start` で起動します

### 5) 動作確認
- アプリURLにアクセス
- `/new` からセッションを開始して、メッセージ送信・レビュー生成まで確認

## Auth notes
- **Default**: Supabase magic-link auth. Users enter email on the landing screen.
- **Dev bypass**: set `DEV_BYPASS_AUTH=true` and `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` to enable a cookie-based anonymous user id.

For production usage, prefer Supabase auth helpers or JWT validation in API routes. The database policies are defined with RLS for proper user isolation.

## API Routes
- `POST /api/session` — create a session.
- `GET /api/session/[id]` — load session details + messages.
- `POST /api/session/[id]/message` — stream partner response + coach metrics. Use `{ draftOnly: true }` for preflight rewrites.
- `POST /api/session/[id]/end` — end session + create review.
- `GET /api/session/[id]/review` — fetch review data.

## LLM Integration
`lib/llm.ts` abstracts the LLM provider. It uses `fetch` with an OpenAI-compatible Chat Completions API.
- `chatCompletion({ system, messages, stream, jsonMode })`
- `streamChatTokens({ system, messages })` for partner streaming.

Coach and Review outputs are strictly JSON.

## Project Structure
```
app/                Next.js pages & API routes
components/         UI components + session UI
lib/                LLM + Supabase utilities + prompts
supabase/           Schema + RLS policies
```

## Development Tips
- If the coach panel shows “Coach unavailable,” check `LLM_API_KEY` and network access.
- Supabase service role key is used on the server to write session data.
