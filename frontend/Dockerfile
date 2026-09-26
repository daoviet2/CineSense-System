FROM node:22-alpine

ENV NODE_ENV=development
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]