# Stage 1: Build React app
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Update SSL certificates
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --default-timeout=120 -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=120 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=120 -r requirements.txt

# Copy backend code
COPY backend/app/ /app/app/

# Copy built React app from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/app/data

EXPOSE 8000

ENV QWEN_API_URL=${QWEN_API_URL}
ENV QWEN_API_KEY=${QWEN_API_KEY}
ENV QWEN_MODEL=${QWEN_MODEL:-qwen-plus}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
