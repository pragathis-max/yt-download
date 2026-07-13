# YouTube Video Downloader - Deployment Guide

If you are deploying this application, please follow this guide to ensure everything works correctly.

## ⚠️ Why Vercel is NOT compatible
If you deploy this full-stack application directly to **Vercel**, you will find that video parsing and downloading do not work. This is due to several structural limitations of Vercel's hosting environment:

1. **Serverless Execution Limits**: Vercel runs backend code as temporary serverless functions. These functions have strict execution timeouts (typically 10 to 15 seconds for free accounts), which is not enough time to download large video/audio files.
2. **Missing `yt-dlp` & Python Binaries**: The core engine of this app relies on the `yt-dlp` tool to communicate with YouTube. `yt-dlp` requires **Python** and standard Linux packages to be pre-installed in the hosting system. Vercel's serverless containers do not include Python or `yt-dlp` in their environment path.
3. **Missing `ffmpeg`**: To download high-resolution videos (1080p, 2K, 4K), YouTube serves video and audio streams separately. The server merges them together using `ffmpeg`. Vercel lacks the `ffmpeg` binary required to perform this post-processing.
4. **Read-Only / Ephemeral Filesystem**: Vercel does not allow writing files to the local disk (except a temporary `/tmp` folder with small storage limits). The downloaded videos have nowhere to be stored on the server before transferring them to your browser.
5. **No Long-Lived WebSockets / SSE**: The app uses Server-Sent Events (SSE) to send real-time download speed, progress bars, and ETA calculations back to your browser. Vercel serverless functions do not support persistent streaming channels.

---

## 🚀 Recommended Hosting Alternatives

To host this application fully and successfully, you should use a **container-based** or **virtual machine (VM)** provider that supports full-stack Node.js environments with custom OS-level packages (like `python3` and `ffmpeg`).

### 1. Railway (Recommended & Easiest)
Railway is highly recommended because it supports custom builders and Nixpacks, which can automatically install Python and FFmpeg.

* **Setup Steps**:
  1. Push this project to a GitHub repository.
  2. Create an account on [Railway.app](https://railway.app/).
  3. Click **New Project** &rarr; **Deploy from GitHub repo** &rarr; Select your repository.
  4. In the Railway dashboard under your service settings, add these **Variables** (Environment variables):
     * `PORT` = `3000`
     * `NODE_ENV` = `production`
     * `GEMINI_API_KEY` = *(Your Gemini Key for AI Companion summary)*
  5. Under **Nixpacks** settings, Railway will automatically detect Node.js. To ensure `ffmpeg` and `python` are installed, you can add a `Nixpacks` config or use the custom **Apt Packages** builder.

### 2. Render (Web Services)
Render allows you to build full-stack web applications using Docker or standard web services.

* **Setup Steps**:
  1. Create an account on [Render.com](https://render.com/).
  2. Click **New +** &rarr; **Web Service** &rarr; Connect your GitHub repository.
  3. Select **Docker** as the Runtime (recommended), OR select **Node** and use a custom Build Command.
  4. If you use Docker, create a simple `Dockerfile` in the root (see template below). This is the absolute most reliable method!
  5. Add environment variables:
     * `GEMINI_API_KEY` = *(your api key)*
     * `PORT` = `3000`

### 3. Google Cloud Run (Fully Compliant Container Hosting)
This is the same backend environment that AI Studio uses. It runs a full Docker container with lightning-fast speeds and automatically scales to zero when not in use.

* **Setup Steps**:
  1. Create a `Dockerfile` (see below).
  2. Build and push the container to Google Artifact Registry.
  3. Deploy the container on Google Cloud Run.
  4. Ensure your container port is set to `3000`.

---

## 🐳 Dockerfile Template (Highly Recommended)
Creating a `Dockerfile` makes your deployment 100% reliable on **Render, Cloud Run, Railway, or VPS (DigitalOcean, Linode, AWS)** because it guarantees that `python3`, `ffmpeg`, and `yt-dlp` are perfectly installed in the system.

Create a file named `Dockerfile` in your project root with the following content:

```dockerfile
# Use official Node.js image
FROM node:20-slim

# Install system dependencies (Python3, FFmpeg, curl)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend and bundle the backend server
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]
```

Using this Dockerfile will ensure that your video downloader works flawlessly on any cloud provider!
