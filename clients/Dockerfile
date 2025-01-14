# Frontend Build
FROM node:18 AS frontend-build
WORKDIR /clients
COPY package*.json ./
RUN npm install -f
COPY . .
RUN npm run build