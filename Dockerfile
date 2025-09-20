# ----- Giai đoạn 1: Dependencies -----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ----- Giai đoạn 2: Builder -----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# ----- Giai đoạn 3: Runner -----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
USER nextjs

# Mở port mà Next.js sẽ chạy BÊN TRONG container
EXPOSE 3000

# Thiết lập port mặc định cho lệnh start
ENV PORT 3000

# Đảm bảo file package.json của bạn có script: "start": "next start"
# Next.js sẽ tự động nhận biến môi trường PORT
CMD ["npm", "start"]