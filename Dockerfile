FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install LibreOffice Writer (headless DOCX -> PDF) + standard & custom fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-common \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bake custom fonts (Great Vibes, Lato) into the container for Journal PDF rendering
COPY gotenberg/fonts/ /usr/local/share/fonts/custom/
RUN fc-cache -f -v || true

WORKDIR /app

# 1. Install frontend dependencies via pnpm
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Install backend dependencies inside /app/server
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server install --omit=dev

# 3. Copy application source and build the React frontend into /app/dist
COPY . .
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
