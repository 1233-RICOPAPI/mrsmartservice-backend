# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma en Alpine suele necesitar openssl
RUN apk add --no-cache openssl

# 1) Copia manifests
COPY package.json package-lock.json ./

# 2) Instala dependencias SIN scripts (evita postinstall=prisma generate antes de tener schema)
RUN npm ci --ignore-scripts

# 3) Copia el código (incluye prisma/schema.prisma)
COPY . .

# 4) Genera Prisma Client ya con schema dentro
RUN npx prisma generate

# 5) Build Nest (dist)
RUN npm run build

# 6) Deja solo deps de producción
RUN npm prune --omit=dev


# ---------- Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

# Copia lo mínimo para runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# uploads no se debe copiar si está en .dockerignore; créala
RUN mkdir -p /app/uploads

EXPOSE 8080
CMD ["node","dist/main.js"]
