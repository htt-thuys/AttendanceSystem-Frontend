# Build docker (production)

```bash
docker build -f docker/Dockerfile.nginx -t attendance-frontend .
```

# Generate self-signed cert (for LAN test)

```bash
mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/selfsigned.key \
  -out docker/certs/selfsigned.crt \
  -subj "/CN=172.16.75.38"
```

# Run docker (HTTPS for camera + optional HTTP redirect)

```bash
docker run -d \
  -p 5173:443 \
  -p 5174:80 \
  -v $(pwd)/docker/certs:/etc/nginx/certs:ro \
  --name frontend \
  attendance-frontend
```

Open: `https://172.16.75.38:5173/recognition`

Note: browser will warn because cert is self-signed. Accept the warning to continue and allow camera permission.