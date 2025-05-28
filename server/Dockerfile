# Use Python with Node support
FROM python:3.11-slim

# Install system and Node.js dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl git build-essential ffmpeg libportaudio2 libasound-dev portaudio19-dev \
    x11-utils xvfb x11-xserver-utils xauth xfonts-base gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Node.js deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install

# Install Python deps
COPY server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Pre-create logs and data files
RUN mkdir -p /app/server/uploads && \
    touch /app/server/ai_responses_log.txt /app/server/resume_context.txt /app/server/queued_question.txt

# Expose backend port
EXPOSE 5000

# Start Node & Python processes
CMD ["bash", "-c", "trap 'exit' SIGINT; node index.js & python3 memory.py; wait"]
