# The Yard - Home Server Hosting Guide

Complete walkthrough for hosting The Yard on a home server using Proxmox, Docker,
a UDM router, and GitHub Actions for automated deployments.

---

## Table of Contents

1. [Get a Domain](#1-get-a-domain)
2. [Create the VM in Proxmox](#2-create-the-vm-in-proxmox)
3. [Configure the VM](#3-configure-the-vm)
4. [Install Docker](#4-install-docker)
5. [Network & Firewall (UDM)](#5-network--firewall-udm)
6. [Set Up Caddy (Reverse Proxy + HTTPS)](#6-set-up-caddy-reverse-proxy--https)
7. [Deploy the App](#7-deploy-the-app)
8. [Configure GitHub Actions Secrets](#8-configure-github-actions-secrets)
9. [Generate an SSH Deploy Key](#9-generate-an-ssh-deploy-key)
10. [First Deployment](#10-first-deployment)
11. [Verify the Pipeline](#11-verify-the-pipeline)
12. [Ongoing Maintenance](#12-ongoing-maintenance)

---

## 1. Get a Domain

Buy a domain from any registrar (Cloudflare, Namecheap, Porkbun, etc.).
Cloudflare is recommended because it doubles as a free CDN/proxy and makes
DNS management simple.

### If you have a static IP

Create an **A record** pointing to your public IP:

```
Type: A
Name: theyard        (or @ for root)
Value: <your-public-ip>
TTL: Auto
```

### If you don't have a static IP (most home connections)

Use a DDNS service to keep your domain pointed at your changing IP.

**Option A - Cloudflare DDNS (recommended if using Cloudflare DNS):**

Run a lightweight container on your server that updates Cloudflare automatically:

```bash
# On the Proxmox VM (after Docker is installed)
docker run -d --name cloudflare-ddns --restart unless-stopped \
  -e CF_API_TOKEN=<your-cloudflare-api-token> \
  -e DOMAINS=theyard.yourdomain.com \
  -e PROXIED=false \
  favonia/cloudflare-ddns
```

Create the API token in Cloudflare: My Profile > API Tokens > Create Token >
Edit zone DNS template. Scope it to your domain's zone.

**Option B - DuckDNS (free, no domain purchase needed for testing):**

1. Go to https://www.duckdns.org, sign in, claim a subdomain (e.g., `theyard.duckdns.org`)
2. Run the updater as a cron job on your server:
   ```bash
   echo "*/5 * * * * curl -s 'https://www.duckdns.org/update?domains=theyard&token=YOUR_TOKEN'" \
     | crontab -
   ```
3. If you own a domain, CNAME it to your DuckDNS subdomain:
   ```
   Type: CNAME
   Name: theyard
   Value: theyard.duckdns.org
   ```

---

## 2. Create the VM in Proxmox

### Download an ISO

In Proxmox web UI: **local (storage) > ISO Images > Download from URL**

Use Ubuntu Server 24.04 LTS:
```
https://releases.ubuntu.com/24.04/ubuntu-24.04.2-live-server-amd64.iso
```

### Create the VM

**General:**
- VM ID: pick one (e.g., `200`)
- Name: `the-yard`

**OS:**
- ISO image: the Ubuntu ISO you downloaded

**System:**
- Machine: `q35`
- BIOS: `OVMF (UEFI)` — add EFI disk
- SCSI Controller: VirtIO SCSI single

**Disks:**
- Disk size: **20 GB** minimum (the app + Docker images)
- Storage: wherever you keep VM disks

**CPU:**
- Cores: **2** (enough for a Next.js app)

**Memory:**
- RAM: **2048 MB** (2 GB) minimum, 4096 if you can spare it

**Network:**
- Bridge: `vmbr0` (your LAN bridge)
- Model: VirtIO

### Install Ubuntu

1. Start the VM, open the console
2. Run through the Ubuntu Server installer:
   - Select your language/keyboard
   - Use the entire disk (guided partitioning is fine)
   - Set your username (e.g., `deploy`) and a strong password
   - **Enable OpenSSH server** when prompted
   - Skip optional snaps
3. Reboot when finished
4. Note the VM's IP address: `ip addr show` (look for the `inet` on your LAN interface)

### Set a Static IP (recommended)

On the UDM, you can assign a fixed IP via DHCP reservation instead of
configuring it inside the VM. This is easier to manage:

1. UDM UI > **Settings > Networks > Default > DHCP > Static IP**
2. Add an entry mapping the VM's MAC address to your chosen IP (e.g., `192.168.1.50`)
3. Reboot the VM or renew its lease: `sudo dhclient -r && sudo dhclient`

---

## 3. Configure the VM

SSH into the VM from your workstation:

```bash
ssh deploy@192.168.1.50   # use whatever IP/user you set
```

### Update packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Install essentials

```bash
sudo apt install -y curl git ufw
```

### Configure the firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh           # port 22
sudo ufw allow 80/tcp        # HTTP  (for Caddy / Let's Encrypt)
sudo ufw allow 443/tcp       # HTTPS (for Caddy)
sudo ufw enable
sudo ufw status
```

> Port 3000 does NOT need to be opened externally. Caddy will reverse-proxy
> to it locally inside the VM.

### Harden SSH

Edit `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config
```

Set these values:

```
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

Copy your public key from your workstation:

```bash
# Run this from your LOCAL machine, not the server
ssh-copy-id deploy@192.168.1.50
```

Then restart SSH on the server:

```bash
sudo systemctl restart sshd
```

---

## 4. Install Docker

```bash
# Add Docker's official GPG key and repo
curl -fsSL https://get.docker.com | sudo sh

# Let your user run docker without sudo
sudo usermod -aG docker $USER

# Log out and back in for the group change to take effect
exit
```

SSH back in and verify:

```bash
docker --version
docker compose version
```

---

## 5. Network & Firewall (UDM)

You need to forward two ports from the internet through your UDM to the VM.

### Port Forwarding

In the UDM UI: **Settings > Firewall & Security > Port Forwarding > Create New Rule**

**Rule 1 - HTTPS:**

| Field            | Value              |
|------------------|--------------------|
| Name             | `the-yard-https`   |
| Enabled          | Yes                |
| From             | Any                |
| Port             | `443`              |
| Forward IP       | `192.168.1.50`     |
| Forward Port     | `443`              |
| Protocol         | TCP                |

**Rule 2 - HTTP (for Let's Encrypt certificate challenges):**

| Field            | Value              |
|------------------|--------------------|
| Name             | `the-yard-http`    |
| Enabled          | Yes                |
| From             | Any                |
| Port             | `80`               |
| Forward IP       | `192.168.1.50`     |
| Forward Port     | `80`               |
| Protocol         | TCP                |

**Rule 3 - SSH (for GitHub Actions deploys):**

Pick a non-standard port to reduce noise from bots (e.g., `2222`):

| Field            | Value              |
|------------------|--------------------|
| Name             | `the-yard-ssh`     |
| Enabled          | Yes                |
| From             | Any                |
| Port             | `2222`             |
| Forward IP       | `192.168.1.50`     |
| Forward Port     | `22`               |
| Protocol         | TCP                |

> Using port `2222` externally means GitHub Actions connects on `2222`, but
> the VM still listens on `22`. Set `DEPLOY_PORT=2222` in GitHub secrets.

### UDM Firewall Rules

The UDM's default firewall allows established/related traffic back out and
blocks unsolicited inbound. The port forwarding rules above override this
for the specific ports. No additional firewall rules are needed on the UDM
unless you want to restrict source IPs.

**Optional - restrict SSH to GitHub Actions IPs only:**

If you want to lock down SSH access to only GitHub's runners, you can create
a firewall rule on the UDM that limits port 2222 to GitHub's IP ranges
(published at https://api.github.com/meta under `actions`). However, these
IPs change, so this is high-maintenance. The SSH key requirement is sufficient
for most home setups.

---

## 6. Set Up Caddy (Reverse Proxy + HTTPS)

Caddy automatically provisions and renews Let's Encrypt TLS certificates.
Run it as a Docker container alongside the app.

### Create the directory structure

```bash
mkdir -p ~/the-yard
cd ~/the-yard
```

### Create the Caddyfile

```bash
cat > ~/the-yard/Caddyfile << 'EOF'
theyard.yourdomain.com {
    reverse_proxy the-yard:3000
}
EOF
```

Replace `theyard.yourdomain.com` with your actual domain.

### Update docker-compose.yml

Copy the project's docker-compose and add Caddy. Create this file at
`~/the-yard/docker-compose.yml`:

```yaml
services:
  the-yard:
    image: ghcr.io/tsettle44/the-yard:${IMAGE_TAG:-latest}
    expose:
      - "3000"
    env_file:
      - .env
    environment:
      - DEPLOYMENT_MODE=hosted
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # HTTP/3 (QUIC)
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - the-yard

volumes:
  caddy_data:
  caddy_config:
```

> Note: the app service uses `expose` instead of `ports` now. Caddy handles
> external traffic. The app is only reachable through the reverse proxy.

---

## 7. Deploy the App

### Create the .env file

```bash
cat > ~/the-yard/.env << 'EOF'
# -- Supabase --
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# -- Anthropic (AI workout generation) --
ANTHROPIC_API_KEY=sk-ant-...

# -- Stripe (payments, optional) --
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# -- App --
NEXT_PUBLIC_APP_URL=https://theyard.yourdomain.com
NEXT_PUBLIC_DEPLOYMENT_MODE=hosted
EOF
```

Replace all placeholder values with your real credentials.

### Log in to GHCR

The server needs to pull Docker images from GitHub Container Registry.

1. Go to https://github.com/settings/tokens
2. Create a **Personal Access Token (classic)** with `read:packages` scope
3. Run:

```bash
echo "<YOUR_PAT>" | docker login ghcr.io -u <your-github-username> --password-stdin
```

### Pull and start

```bash
cd ~/the-yard
docker compose pull
docker compose up -d
```

Verify it's running:

```bash
docker compose ps
curl -s http://localhost:3000/api/health
```

Check the domain works (after DNS propagates):

```bash
curl -s https://theyard.yourdomain.com/api/health
```

---

## 8. Configure GitHub Actions Secrets

Go to your GitHub repo: **Settings > Secrets and variables > Actions**

### Repository Secrets

| Secret           | Value                                          |
|------------------|------------------------------------------------|
| `DEPLOY_HOST`    | Your public IP or domain (e.g., `theyard.yourdomain.com`) |
| `DEPLOY_USER`    | `deploy` (or whatever user you created)        |
| `DEPLOY_SSH_KEY` | Contents of the deploy private key (see step 9)|
| `DEPLOY_PORT`    | `2222` (the external SSH port from your UDM forwarding rule) |
| `DEPLOY_PATH`    | `~/the-yard`                                   |

### Environment

Go to **Settings > Environments > New environment**

- Name: `production`
- No additional protection rules needed (or add required reviewers if you want manual approval before deploys)

---

## 9. Generate an SSH Deploy Key

Create a dedicated key pair for GitHub Actions. Do this on your local machine
(not the server):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/the-yard-deploy -N ""
```

This creates two files:
- `~/.ssh/the-yard-deploy` (private key) - goes into GitHub secrets
- `~/.ssh/the-yard-deploy.pub` (public key) - goes onto the server

### Add the public key to the server

```bash
ssh-copy-id -i ~/.ssh/the-yard-deploy.pub deploy@192.168.1.50
```

Or manually append it:

```bash
cat ~/.ssh/the-yard-deploy.pub | ssh deploy@192.168.1.50 \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Add the private key to GitHub

```bash
cat ~/.ssh/the-yard-deploy
```

Copy the **entire output** (including the `-----BEGIN/END-----` lines) and
paste it as the value of the `DEPLOY_SSH_KEY` secret in GitHub.

### Verify SSH works through the external port

```bash
ssh -i ~/.ssh/the-yard-deploy -p 2222 deploy@theyard.yourdomain.com "echo ok"
```

If this prints `ok`, GitHub Actions will be able to connect.

---

## 10. First Deployment

Once secrets are configured, trigger the pipeline:

```bash
# From your local checkout of the repo
git commit --allow-empty -m "trigger deploy"
git push
```

Watch the pipeline at: `https://github.com/tsettle44/the-yard/actions`

The pipeline will:
1. **Lint** - ESLint
2. **Typecheck** - `tsc --noEmit`
3. **Test** - Vitest (408 tests)
4. **Build** - `next build` validation
5. **Docker** - Build image, push to `ghcr.io/tsettle44/the-yard:<sha>`
6. **Deploy** - SSH to your server, pull the new image, recreate the container
7. **Health check** - curl `/api/health` to verify the app is responding

---

## 11. Verify the Pipeline

After the first successful deploy, confirm everything end-to-end:

```bash
# From your local machine
curl -s https://theyard.yourdomain.com/api/health | jq .
```

Expected:
```json
{
  "status": "ok",
  "mode": "hosted",
  "timestamp": "2026-03-02T..."
}
```

### Troubleshooting

**Pipeline fails at "Deploy via SSH":**
- Verify SSH connectivity: `ssh -i ~/.ssh/the-yard-deploy -p 2222 deploy@<host> "docker ps"`
- Check the DEPLOY_HOST secret matches your public IP / domain
- Verify the port forwarding rule on the UDM is active
- Check UFW on the VM: `sudo ufw status`

**Pipeline fails at "Health check":**
- The app container might be crashing. SSH in and check:
  ```bash
  cd ~/the-yard
  docker compose logs --tail 50 the-yard
  ```
- Verify `.env` has all required variables
- Check Caddy logs: `docker compose logs caddy`

**HTTPS not working:**
- Caddy needs ports 80 and 443 open to the internet for Let's Encrypt
- Verify both port forwarding rules on UDM are active
- Check Caddy logs: `docker compose logs caddy`
- DNS must be propagated: `dig theyard.yourdomain.com`

**App works locally but not through domain:**
- DNS not propagated yet (can take up to 48h, usually minutes)
- Cloudflare proxy (orange cloud) can interfere with Caddy's TLS - set DNS-only (gray cloud) if using Caddy for TLS
- Check that the Caddyfile domain matches your actual domain exactly

---

## 12. Ongoing Maintenance

### Update the app

Just push to `main`. The pipeline handles everything automatically.

### View logs

```bash
ssh deploy@192.168.1.50
cd ~/the-yard
docker compose logs -f the-yard     # app logs
docker compose logs -f caddy        # reverse proxy logs
```

### Restart manually

```bash
cd ~/the-yard
docker compose restart the-yard
```

### Update Caddy

```bash
cd ~/the-yard
docker compose pull caddy
docker compose up -d caddy
```

### Prune old Docker images

The deploy script runs `docker image prune -f` after each deploy. For a
deeper cleanup:

```bash
docker system prune -a --volumes   # removes everything unused - be careful
```

### Backup .env

Your `.env` contains all secrets. Back it up somewhere safe (password manager,
encrypted USB, etc.). It is **not** in the git repo.

### Monitor disk space

Docker images accumulate. Check periodically:

```bash
df -h
docker system df
```

---

## Architecture Diagram

```
Internet
  |
  v
[UDM Dream Machine]
  | port 80 ──> VM:80   (Caddy - Let's Encrypt challenges)
  | port 443 ─> VM:443  (Caddy - HTTPS traffic)
  | port 2222 > VM:22   (SSH - GitHub Actions deploys)
  |
  v
[Proxmox VM - Ubuntu]
  |
  ├── Caddy (container)
  |     └── reverse proxy :443 -> the-yard:3000
  |
  └── The Yard (container)
        └── Next.js app on :3000
              └── connects to Supabase (hosted DB)

GitHub Actions (on push to main):
  lint -> typecheck -> test -> build -> docker push -> ssh deploy -> health check
```
