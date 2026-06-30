# FaceMatch Pro: Production Deployment & Installation Guide

This guide details steps to provision FaceMatch Pro on a production Linux Server with CUDA acceleration.

## System Prerequisites
*   **Operating System:** Ubuntu 22.04 LTS or Debian 11
*   **Containers:** Docker CE 24.0+ and Docker Compose v2.20+
*   **GPU Support:** NVIDIA Drivers (525+) and NVIDIA Container Toolkit
*   **Hardware Minimums:** 4 Cores CPU, 16GB RAM, NVIDIA T4 or RTX 3060 (optional, speeds up extraction to under 15ms).

---

## Step 1: Clone the Application & Setup Env
Create your production folder structure, copying docker-compose and nginx configurations into place.

```bash
mkdir -p /opt/facematchpro
cd /opt/facematchpro
```

Configure your secure production parameters inside `/opt/facematchpro/.env`:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://facematch_admin:SecretSecurePassword123!@db:5432/facematch_prod
REDIS_URL=redis://cache:6379
AI_SERVICE_URL=http://ai-service:8000
JWT_SECRET=YourSuperLongCryptographicRandomTokenSecretString99!
```

---

## Step 2: Download InsightFace Biometric Model Files
RetinaFace detectors and ArcFace recognizers must reside inside the `ai_service/models` directory.

```bash
mkdir -p /opt/facematchpro/ai_service/models
cd /opt/facematchpro/ai_service/models

# Download the buffalo_l (512-dimension vector) standard pack from insightface public releases
wget https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip
unzip buffalo_l.zip -d buffalo_l
rm buffalo_l.zip
```

---

## Step 3: Install NVIDIA Container Toolkit (For CUDA GPU Acceleration)
To enable real-time camera extraction, configure Docker to parse CUDA instruction sets.

```bash
# Add NVIDIA GPG Key
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/ Geist/sources.list.d/nvidia-container-toolkit.list

# Install toolkit
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Restart docker service to register nvidia-runtime
sudo systemctl restart docker
```

Uncomment the `deploy.resources.reservations.devices` block inside `Docker_Compose.yml` to route GPU lanes to `facematch-ai-service`.

---

## Step 4: Launch Microservices via Docker Compose
Rebuild and run the ecosystem in daemon background mode.

```bash
cd /opt/facematchpro
docker compose up -d --build
```

Verify service check status loops:
```bash
docker compose ps
```

---

## Step 5: Setup SSL Certificate and Nginx proxy Load Balancer
Generate Let's Encrypt certificates and install your Nginx server block.

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Request Let's Encrypt Certificate
sudo certbot certonly --standalone -d facematchpro.com -d www.facematchpro.com

# Copy the custom Nginx reverse proxy configuration
sudo cp /opt/facematchpro/deliverables/Nginx_Reverse_Proxy.conf /etc/nginx/nginx.conf

# Restart nginx
sudo systemctl restart nginx
```

---

## Step 6: Initialize Databases
Once PostgreSQL boots up, run your pgvector schema:

```bash
docker exec -i facematch-db psql -U facematch_admin -d facematch_prod < /opt/facematchpro/deliverables/PostgreSQL_Schema.sql
```

The system is now online! Access the web console by navigating to `https://facematchpro.com`.
- Default Master credentials: `admin@facematch.pro` / `password`.
