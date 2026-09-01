# Deployment & Staging Guide — Shift Application

## 1. Overview of Deployment Environments

The deployment pipeline is strictly segregated between **Staging** and **Production**.

| Component | Staging (`staging.att.pawndancertt.tech`) | Production (`att.pawndancertt.tech`) |
| :--- | :--- | :--- |
| **Directory** | `/root/hermes/projects/shift` | `/root/hermes/projects/shift-prod` |
| **Git Branch** | `develop` | `main` |
| **Frontend Port** | `34481` (`shift-staging-frontend.service`) | `34471` (`worktime-miniapp.service`) |
| **Backend Port** | `34482` (`shift-staging-api.service`) | `34472` (`worktime-api.service`) |
| **Nginx Config** | `/etc/nginx/sites-available/staging.att.pawndancertt.tech` | `/etc/nginx/sites-available/att.pawndancertt.tech` |

---

## 2. Staging Deployment Procedure (Automated / Agent-Driven)

When developing features or bugfixes, deploy to Staging as follows:

```bash
# Step 1: Navigate to repository
cd /root/hermes/projects/shift

# Step 2: Ensure branch is merged to develop
git checkout develop
git pull origin develop

# Step 3: Verify and build frontend
cd /root/hermes/projects/shift/apps/frontend
npm run build

# Step 4: Verify backend unit tests
cd /root/hermes/projects/shift/apps/backend
pytest -v tests/

# Step 5: Restart Staging Services
systemctl restart shift-staging-api.service
systemctl restart shift-staging-frontend.service

# Step 6: Verify active state
systemctl is-active shift-staging-api.service shift-staging-frontend.service
```

---

## 3. Production Deployment Procedure (Strict Human Gate)

> ⚠️ **CRITICAL RULE:** Deployment to Production is ONLY executed upon explicit user instruction from Amirhossein (@Awmir).

When user approves production release:

```bash
# Step 1: Open Release PR from develop to main
cd /root/hermes/projects/shift
gh pr create --base main --head develop --title "chore(release): merge develop into main" --body "Automated release PR."

# Step 2: Once PR is merged into main:
cd /root/hermes/projects/shift-prod
git pull origin main

# Step 3: Build production frontend
cd /root/hermes/projects/shift-prod/apps/frontend
npm run build

# Step 4: Restart production services
systemctl restart worktime-api.service
systemctl restart worktime-miniapp.service

# Step 5: Verify status
systemctl is-active worktime-api.service worktime-miniapp.service
```

---

## 4. Troubleshooting & Rollbacks

- **Check API logs:**
  ```bash
  journalctl -u shift-staging-api.service -n 100 --no-pager
  journalctl -u worktime-api.service -n 100 --no-pager
  ```
- **Check Frontend logs:**
  ```bash
  journalctl -u shift-staging-frontend.service -n 100 --no-pager
  journalctl -u worktime-miniapp.service -n 100 --no-pager
  ```
- **Check Nginx proxy logs:**
  ```bash
  tail -n 50 /var/log/nginx/error.log
  ```
