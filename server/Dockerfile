FROM node:20-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server ./
COPY db ../db
EXPOSE 3000
CMD ["npm", "start"]
