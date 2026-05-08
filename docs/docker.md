#Build docker

```
docker build -f docker/Dockerfile -t attendance-frontend .
```

#Run docker

```
docker run -d -p 5173:5173 --name frontend attendance-frontend
```
