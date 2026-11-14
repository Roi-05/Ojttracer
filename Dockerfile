FROM node:20-bookworm-slim

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

# Enable pnpm via Corepack and install dependencies first (cached layer)
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source and build the React frontend into /app/dist
COPY . .
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]

