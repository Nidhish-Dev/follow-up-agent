# 🍇 GrapeLabs AI - FollowUp Agent Control Plane

A modern, full-stack Next.js dashboard and control plane for autonomous B2B/D2C cold email follow-up workflows orchestrated with **n8n**, **OpenAI**, **Telegram Bot**, **Google Sheets**, **Gmail**, and **Google Drive**.

---

## 🌟 Key Features

### 1. 🔐 Secure Connection Vault
- **Encrypted at Rest**: All sensitive API keys and OAuth secrets are encrypted client/server-side using **AES-256-GCM** before being saved to Firebase Firestore.
- **Auto-Sync to n8n**: Automatically provisions and syncs credentials directly into your self-hosted or Railway n8n instance using the n8n REST API.
- Supported integrations:
  - **OpenAI**: Model selection (`gpt-4o-mini`, `gpt-4o`) and system prompts.
  - **Gmail**: OAuth2 credentials and sending mailbox.
  - **Google Sheets**: Spreadsheet ID for Lead Tracking and Automation Responses.
  - **Telegram**: Bot token and Chat ID for approval buttons and preview cards.
  - **Google Drive**: Folder IDs for uploading and publishing AI architecture diagrams.
  - **n8n**: Base URL, Webhook URL, and API key.

### 2. ⚡ Workflow Control & Live Execution Tracing
- **Real-Time Step Tracing**: Live visual progress indicators showing active, completed, or failed stages during execution.
- **Workflow Kill Switch**: Unpublish / publish the n8n workflow directly from the dashboard.
- **Stop Execution Button**: Instantly halt any running execution in n8n with one click.
- **Detailed Execution Inspector**: Inspect execution time, step-by-step node durations, and error diagnostics.

### 3. 🎯 Lead Qualification Engine (`Deduplicate & Qualify Leads1`)
- **Minimum Email Opens**: Dynamically adjust qualification threshold (e.g. qualify leads with $\ge 2$ opens instead of hardcoded numbers).
- **Link Click Inclusion**: Toggle to qualify leads who clicked CTA links and configure minimum link clicks.
- **Qualification Logic Mode**: Choose between `OR` (Opens $\ge X$ OR Clicks $\ge Y$) or `AND` (Requires both).
- **Zero n8n Redeployment**: Passed dynamically via webhook payloads and `/api/config`.

### 4. ⏰ Automated Workflow Scheduler
- **Interactive Calendar**: Visual date range selector with start date, end date, or continuous run mode.
- **Active Day Presets**: Quick filters for Weekdays, Weekends, or All Days.
- **Precision Time & Timezone**: Configure execution time down to the minute in any global timezone.
- **Dual Trigger Engine**:
  - Live client-side scheduler ticker with 10-minute duplicate prevention.
  - Automated 24/7 synchronization directly with n8n's native `Schedule Trigger` node.

### 5. ✉️ Email HTML Designer & Live Gmail Preview
- **Interactive Code Editor**: Customize the outreach email HTML copy and footer signature.
- **Clickable Variable Chips**: Easily insert dynamic tags:
  - `{{first_name}}` — Lead's first name
  - `{{brand}}` — Brand name
  - `{{achievement_hook}}` — AI-generated hook
  - `{{hook_closer}}` — High-impact closing statement
  - `{{vertical_focus}}` — Specific operations focus description
  - `{{call_url}}` — Calendly tracking booking link
  - `{{sender_name}}` — Sender name
- **Live Client Preview**: Real-time rendering simulating desktop Gmail and mobile (iPhone frame) displays with sample test personas.
- **Live Sync**: Saved to Firestore and served directly to downstream n8n nodes via `/api/config`.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Anonymous Auth)
- **Admin SDK**: [Firebase Admin Node SDK](https://firebase.google.com/docs/admin/setup)
- **Cryptography**: Node.js `crypto` (AES-256-GCM)
- **Workflow Engine**: [n8n](https://n8n.io/)

---

## 📋 Environment Configuration

Create a `.env.local` file in the root directory. You can copy the template from `.env.example`:

```bash
cp .env.example .env.local
```

### `.env.example` Reference

```env
# ==============================================================================
# 1. Firebase Client Configuration (Frontend Auth & Firestore)
# Obtain from: Firebase Console > Project Settings > General > Your apps (Web)
# Ensure enabled: Authentication > Sign-in method > Anonymous
# ==============================================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# ==============================================================================
# 2. Firebase Admin SDK Configuration (Server-Side Database Access)
# Obtain from: Firebase Console > Project Settings > Service Accounts > Generate new private key
# ==============================================================================
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ==============================================================================
# 3. Credential Encryption Key
# 32-byte key used for AES-256-GCM encryption of third-party credentials.
# Must be 64 hexadecimal characters OR a 32-byte Base64-encoded string.
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# ==============================================================================
CREDENTIAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ==============================================================================
# 4. Cron Security Token (Optional)
# Secret header token required by POST /api/schedule/run when triggered externally
# ==============================================================================
CRON_SECRET=your_secure_cron_token_here
```

### Generating the `CREDENTIAL_ENCRYPTION_KEY`
Run this one-liner in your terminal to generate a secure 32-byte hex key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.18+` or `v20+`
- **npm**, **pnpm**, or **yarn**
- **Firebase Project**: with Firestore database created and Anonymous Authentication enabled.
- **n8n Instance**: self-hosted or deployed on Railway.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Nidhish-Dev/follow-up-agent.git
cd follow-up-agent
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── config/             # GET /api/config: serves credentials & templates to n8n
│   │   │   ├── integrations/       # PUT/DELETE /api/integrations: vault credential management
│   │   │   ├── n8n/                # n8n management (executions, stop, toggle workflow, provision)
│   │   │   ├── qualification/      # GET/POST /api/qualification: lead qualification rules
│   │   │   ├── schedule/           # GET/POST /api/schedule: scheduler config & n8n sync
│   │   │   │   └── run/            # POST /api/schedule/run: scheduler execution endpoint
│   │   │   ├── template/           # GET/POST /api/template: email HTML template storage
│   │   │   └── workflow/trigger/   # POST /api/workflow/trigger: runs n8n webhook
│   │   ├── globals.css             # Design system & dashboard styles
│   │   ├── layout.tsx              # Root HTML shell & metadata
│   │   └── page.tsx                # Main single-page application dashboard
│   ├── components/
│   │   └── EmailTemplateView.tsx   # Interactive email HTML editor with live Gmail preview
│   └── lib/
│       ├── credentials.ts          # AES-256-GCM encryption & decryption helpers
│       ├── email-template-types.ts # Email template interfaces & default copy
│       ├── firebase-admin.ts       # Firebase Admin SDK singleton initializer
│       ├── n8n-client.ts           # n8n REST API client helper
│       ├── n8n-sync.ts             # Credential sync engine to n8n
│       ├── qualification-types.ts  # Lead qualification configuration interfaces
│       ├── schedule-helper.ts      # Date/time calculation & recurrence rules
│       └── workspace-db.ts         # Multi-tenant Firestore document path resolvers
├── .env.example                    # Environment variable template
├── package.json                    # Project metadata & dependencies
└── tsconfig.json                   # TypeScript configuration
```

---

## 🔄 n8n Workflow Integration

The dashboard is designed to orchestrate the n8n workflow **`FollowUp Agent Frontend`** (`aCjx6rCJa5glRnBS`):

1. **Triggering**:
   - The frontend triggers the workflow via `POST <n8n_webhook_url>` with payload:
     ```json
     {
       "source": "dashboard",
       "qualification": {
         "minOpens": 2,
         "includeClicked": true,
         "minClicks": 1,
         "matchMode": "or"
       }
     }
     ```
2. **Dynamic Config Node (`Fetch Config`)**:
   - n8n calls `GET https://your-deployment.vercel.app/api/config` to dynamically receive:
     - OpenAI model & system prompt
     - Telegram Chat ID
     - Google Sheet & Drive IDs
     - Lead qualification thresholds
     - Email HTML template & signature
3. **Approval Node (`Verify Lead State in Response Tab`)**:
   - Reads the generated draft and custom signature, attaches the Graphviz diagram, and dispatches via Gmail.

---

## 🚢 Deployment

The easiest way to deploy this application is on **Vercel**:

1. Push your repository to GitHub.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add the variables specified in `.env.example`.
4. Deploy! Any push to `main` will automatically trigger a new deployment.

---

## 📄 License

Private & Proprietary — GrapeLabs AI.
