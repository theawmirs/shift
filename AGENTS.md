# AGENTS.md — Shift Monorepo Autonomous Agent Operating Charter

Welcome to the **Shift (Worktime)** repository. Any AI agent (Hermes, Claude Code, Codex, Antigravity, etc.) operating in this workspace MUST strictly follow the directives, architectural principles, and operational guardrails specified below.

---

## 1. Project Overview & Architecture

Shift is a full-stack Iranian calendar-based (Jalali / Shamsi) worktime, shift, task, and leave management system built for desktop browsers and Telegram MiniApp environments.

### Monorepo Structure
```
/root/hermes/projects/shift/
├── apps/
│   ├── frontend/        # React 18 + Vite + TypeScript MiniApp / Web App
│   │   ├── src/
│   │   │   ├── app/     # Pages & app routing / entry layouts
│   │   │   ├── features/# Feature slices (today, tasks, leave, week, month, settings)
│   │   │   ├── shared/  # UI components (Drawer, Skeleton, Toast, ShamsiCalendar), API, utils
│   │   │   └── styles.css
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.js
│   └── backend/         # FastAPI (Python 3.11/3.12) REST API & Telegram Bot
│       ├── app/
│       │   ├── api/v1/  # API endpoints (attendance, leaves, reports, settings, auth)
│       │   ├── core/    # Config, security, jalali date/time handlers
│       │   ├── db/      # PostgreSQL schema & connection pool
│       │   ├── schemas/ # Pydantic v2 schemas
│       │   ├── services/# Business logic services (record, leave, report, bot, csv)
│       │   └── main.py  # FastAPI application factory
│       ├── tests/       # Pytest suite
│       └── requirements.txt
├── docs/                # Architecture and deployment specifications
├── AGENTS.md            # This specification file
├── README.md
└── package.json
```

---

## 2. Environments & Infrastructure Matrix

The host runs two isolated environments orchestrated by Nginx reverse proxy and Systemd services.

| Parameter | Staging Environment | Production Environment |
| :--- | :--- | :--- |
| **Domain (HTTPS)** | `https://staging.att.pawndancertt.tech` | `https://att.pawndancertt.tech` |
| **Workspace Path** | `/root/hermes/projects/shift` | `/root/hermes/projects/shift-prod` |
| **Git Branch** | `develop` | `main` |
| **Frontend Service** | `shift-staging-frontend.service` (Port: `34481`) | `worktime-miniapp.service` (Port: `34471`) |
| **Backend Service** | `shift-staging-api.service` (Port: `34482`) | `worktime-api.service` (Port: `34472`) |
| **Database** | PostgreSQL (Neon Cloud DB) | PostgreSQL (Neon Cloud DB) |
| **Telegram Bot** | Dual-DB fallback webhook | Production Bot Webhook |

---

## 3. Strict GitFlow & Delivery Rules

1. **Branching Model:**
   - Always create isolated feature or fix branches: `feature/<name>` or `fix/<name>`.
   - All completed, tested work merges strictly into the **`develop`** branch.
   - Delete temporary feature branches post-merge.

2. **CRITICAL PRODUCTION GUARD (HUMAN-GATE):**
   - **NEVER merge into `main` or touch `/root/hermes/projects/shift-prod` without explicit, unambiguous permission from Amirhossein (@Awmir).**
   - After testing on Staging, agents may open a Release Pull Request from `develop` to `main` via `gh pr create --base main --head develop`, but MUST NOT merge it autonomously.

3. **Conventional Commits:**
   - Commit messages must follow: `<type>(<scope>): <concise English description>`.
   - Examples: `feat(leave): add multi-day hourly leave picker`, `fix(frontend): prevent horizontal overflow on drawer open`.

4. **GitHub Identity:**
   - Git identity must use:
     ```bash
     git config user.name "KINETIC-SLDC"
     git config user.email "321383955+KINETIC-SLDC@users.noreply.github.com"
     ```

---

## 4. Frontend Engineering Standards (`apps/frontend`)

- **State Management & Caching:**
  - Use `@tanstack/react-query` for all server interactions.
  - Enforce `staleTime: 60 * 1000` (60 seconds) on data-heavy queries (week, month, tasks) to eliminate UI flickering and duplicate network calls.
- **UI/UX & Responsive Layouts:**
  - **Mobile (< 860px):** Telegram MiniApp experience with fixed bottom navigation, drag-down drawers, and safe-area insets.
  - **Desktop (>= 860px):** Permanent side navigation, responsive modal dialogs (centered with backdrop blur).
  - **Typography & Locales:** Custom Persian font **YekanBakh FaNum**, right-to-left (RTL) direction, Shamsi dates rendered in Persian numerals and month names.
  - **Zero Layout Shifts:** Utilize `Skeleton` components for pending states instead of raw spinners where applicable.
  - **Input Handling:** Center-align time and number inputs; avoid mobile browser auto-zoom quirks.

---

## 5. Backend & Database Engineering Standards (`apps/backend`)

- **PostgreSQL & Remote Database Performance:**
  - Never execute per-day sequential loop queries in reports or summaries (avoids high network latency on Neon cloud DB).
  - Always use **batch-fetching** (max 3-4 parallel queries) followed by in-memory data aggregation and calculation.
- **Timezone & Calendar Handling:**
  - Tehran timezone (`Asia/Tehran`) is the canonical time authority for all business calculations.
  - Convert all timestamps with `dt.astimezone(settings.tehran_tz)` before calculating daily boundaries or overtime.
  - Jalali conversion utilities reside in `app/core/jalali.py`.
- **API Response Contracts:**
  - Pydantic v2 schemas in `app/schemas/` define strict data contracts.
  - Return clear, semantic Persian error messages for user-facing API responses (e.g. `❌ اشتراکی پیدا نشد`).

---

## 6. Development & Verification Workflow

Agents must execute the following commands before declaring any task complete:

```bash
# 1. Frontend Verification
cd /root/hermes/projects/shift/apps/frontend
npm run build

# 2. Backend Verification
cd /root/hermes/projects/shift/apps/backend
pytest -v tests/

# 3. Apply changes to Staging
systemctl restart shift-staging-api.service
systemctl restart shift-staging-frontend.service

# 4. Verify Service Health
systemctl is-active shift-staging-api.service
systemctl is-active shift-staging-frontend.service
```

---

## 7. Operational Golden Rules
- **No Unsanctioned Host Restarts:** Never issue system reboots or disrupt active non-project services.
- **English Code & Artifacts, Persian User Interaction:** All source code, commits, PRs, comments, and internal docs must be in **English**. All communication with the user must be in fluent, respectful **Persian**.
