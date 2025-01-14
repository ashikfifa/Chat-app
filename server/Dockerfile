# Backend Setup
FROM node:18 AS backend
WORKDIR /server
COPY package*.json ./
RUN npm install
COPY . .
# RUN npm run build