FROM python:3.12-slim

WORKDIR /app

# Create a dedicated non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --default-timeout=100 -r requirements.txt

COPY . .

# Ensure appuser owns /app and /tmp/gitaudit_s3_data
RUN mkdir -p /tmp/gitaudit_s3_data && \
    chown -R appuser:appgroup /app /tmp/gitaudit_s3_data

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
