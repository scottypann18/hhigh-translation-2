# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY public/ ./public/

# Create necessary directories
RUN mkdir -p input output

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
