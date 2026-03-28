FROM node:20-alpine

# Install build dependencies required by better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

# Ensure necessary directories exist for volumes
RUN mkdir -p /app/data /app/public/uploads

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
