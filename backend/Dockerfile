FROM python:3.11.9-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# copy packaging and requirements first to leverage Docker layer caching
COPY pyproject.toml setup.cfg requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the project and install the backend package into the image
COPY . .
RUN pip install --no-cache-dir .
RUN chmod +x entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]