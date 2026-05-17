# Control D Dashboard

Self-hosted web dashboard for managing Control D profiles, endpoints, services, filters, and custom DNS rules.

This is an unofficial project. It uses the public Control D API at `https://api.controld.com` with bearer-token authentication, as described in the [Control D API reference](https://docs.controld.com/reference/get-started).

## Docker Image

The GitHub Actions workflow builds the app in `app/` and publishes this image:

```text
ghcr.io/greg-hass/controls-dashboard:latest
```

Tagged releases and branch builds are also published with matching tags when pushed.

## Dockge Stack

Create a new Dockge stack and use:

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

Open `http://your-server:3000`.

If the GitHub Container Registry package is private, log in on the Ubuntu server before deploying:

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u greg-hass --password-stdin
docker pull ghcr.io/greg-hass/controls-dashboard:latest
```

## Control D Setup

1. Create a Control D API token in the Control D dashboard.
2. Open the self-hosted dashboard.
3. Go to Settings.
4. Paste the API token.
5. Disable Demo Mode and save.

The token is stored in browser local storage for this dashboard user. Do not expose the app publicly without your own access controls.

## Local Development

```bash
cd app
npm ci --legacy-peer-deps
npm run dev
```

## Local Docker Build

```bash
docker compose -f app/docker-compose.yml up -d --build
```
