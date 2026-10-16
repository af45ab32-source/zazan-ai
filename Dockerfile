FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy application source code
COPY . .

# Build frontend client assets
RUN cd client && npm run build

# Environment defaults for Cloud Run
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 8080

# Production start command running Express backend
CMD ["npm", "start"]
