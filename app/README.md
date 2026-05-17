# Control D Dashboard

A self-hosted web dashboard for managing [Control D](https://controld.com) DNS filtering profiles, devices, services, and custom rules. Built specifically for family and personal use — no more opening a browser every time you want to block TikTok.

![Dashboard Screenshot](https://your-screenshot-url-here.png)

## Features

- **Overview Dashboard** — At-a-glance stats, charts, recent device activity, current datacenter
- **Profiles Manager** — Toggle service blocking and filters per profile with a single click
- **Devices** — View all endpoints, reassign profiles via dropdown, copy resolver URLs
- **Services Directory** — Browse 20+ services by category, toggle blocking on any profile
- **Custom Rules** — Full CRUD for DNS rules organized in folders (block/allow/redirect)
- **Quick Actions** — One-tap focus modes: Dinner Time, Homework Mode, Bedtime Lock, Social Freeze, Guest Access
- **Network Health** — POP latency charts, service availability, connection details
- **Dark/Light Mode** — Toggle in the sidebar
- **Demo Mode** — Works without an API token for exploration

## Quick Start

### With Docker (recommended)

```bash
git clone https://github.com/greg-hass/controls-dashboard.git
cd controls-dashboard/app
docker compose up -d
```

Then open `http://your-server:3000`

### With Dockge

1. In Dockge, click **"Compose"** → **"New Stack"**
2. Name it `controld-home`
3. Paste this compose config:

```yaml
services:
  controls-dashboard:
    image: ghcr.io/greg-hass/controls-dashboard:latest
    container_name: controls-dashboard
    ports:
      - "3000:80"
    restart: unless-stopped
    environment:
      TZ: Europe/London
```

4. Click **Deploy**

## Connecting to Your Control D Account

1. Go to [controld.com/dashboard/api](https://controld.com/dashboard/api)
2. Generate a **Write** API token
3. Open the dashboard → **Settings**
4. Paste your token, disable **Demo Mode**, click **Save**
5. The dashboard will reload with your live data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide React |

## Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run dev server
npm run dev

# Build for production
npm run build
```

## Disclaimer

Control D Home is an **unofficial** self-hosted dashboard. It is not affiliated with Control D or Windscribe.
