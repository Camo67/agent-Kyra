FROM node:18

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright dependencies
RUN npx playwright install --with-deps chromium

COPY . .

# Expose ports for both app.js and kyra-server.js
EXPOSE 3001 8790

# Use a startup script to run both or just the main one
# For now, let's just start the kyra-server as the core
CMD ["node", "kyra-server.js"]
