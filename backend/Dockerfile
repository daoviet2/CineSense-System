FROM node:22-alpine

ENV NODE_ENV=development
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]