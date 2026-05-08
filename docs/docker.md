#Build docker (production)

```
docker build -f docker/Dockerfile.nginx -t attendance-frontend .
```

#Run docker

```
docker run -d -p 5173:80 --name frontend attendance-frontend
```
