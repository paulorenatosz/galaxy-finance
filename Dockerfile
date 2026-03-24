FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do backend
COPY backend/ .

# Expor porta
EXPOSE 8000

# Rodar (variáveis de ambiente passadas no docker run ou Easypanel)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
