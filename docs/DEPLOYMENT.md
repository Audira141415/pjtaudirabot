# Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Type checking clean (`pnpm type-check`)
- [ ] Database migrations created and tested
- [ ] Environment variables configured
- [ ] Secrets managed (not hardcoded)
- [ ] Docker images built successfully
- [ ] Health checks verified
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Rollback plan documented

## Environment Setup

### Production Environment Variables

```bash
# Application
NODE_ENV=production
LOG_LEVEL=warn
APP_VERSION=1.0.0

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
SERVER_URL=https://api.pjtaudi.bot

# Database (use managed service when possible)
DATABASE_URL=postgresql://user:pass@db-prod-instance:5432/pjtaudi
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_SSL=true

# Redis (use managed service when possible)
REDIS_URL=redis://redis-prod-instance:6379
REDIS_PASSWORD=strong_password_here

# Security
JWT_SECRET=long_random_string_min_32_chars_generated_securely
BCRYPT_ROUNDS=12

# AI Service
OPENAI_API_KEY=sk-prod-key
OPENAI_MODEL=gpt-4

# Monitoring
SENTRY_DSN=https://key@sentry.io/project
```

## Docker Deployment

### 1. Build Images

```bash
# Build all services
docker-compose -f docker/docker-compose.yml build

# Build specific service
docker build -f docker/Dockerfile.api -t pjtaudi-api:1.0.0 .
```

### 2. Push to Registry

```bash
# Tag images
docker tag pjtaudi-api:1.0.0 registry.example.com/pjtaudi-api:1.0.0
docker tag pjtaudi-whatsapp:1.0.0 registry.example.com/pjtaudi-whatsapp:1.0.0
docker tag pjtaudi-telegram:1.0.0 registry.example.com/pjtaudi-telegram:1.0.0

# Push to registry
docker push registry.example.com/pjtaudi-api:1.0.0
docker push registry.example.com/pjtaudi-whatsapp:1.0.0
docker push registry.example.com/pjtaudi-telegram:1.0.0
```

### 3. Deploy Stack

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Verify services
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- Container images pushed to registry
- PersistentVolume provisioner configured

### 1. Create Secrets

```bash
kubectl create secret generic pjtaudi-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  --from-literal=jwt-secret="..." \
  --from-literal=openai-api-key="..."
```

### 2. Deploy Database (PostgreSQL)

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: pjtaudi
        - name: POSTGRES_USER
          value: pjtaudi
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: db-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 50Gi
```

### 3. Deploy Redis

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
```

### 4. Deploy API Service

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pjtaudi-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pjtaudi-api
  template:
    metadata:
      labels:
        app: pjtaudi-api
    spec:
      containers:
      - name: api
        image: registry.example.com/pjtaudi-api:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: jwt-secret
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: pjtaudi-api-service
spec:
  selector:
    app: pjtaudi-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 5. Deploy Bots

```yaml
# whatsapp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pjtaudi-whatsapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pjtaudi-whatsapp
  template:
    metadata:
      labels:
        app: pjtaudi-whatsapp
    spec:
      containers:
      - name: whatsapp
        image: registry.example.com/pjtaudi-whatsapp:1.0.0
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: pjtaudi-secrets
              key: redis-url
        volumeMounts:
        - name: whatsapp-sessions
          mountPath: /data/whatsapp-sessions
      volumes:
      - name: whatsapp-sessions
        persistentVolumeClaim:
          claimName: whatsapp-pvc
```

## Monitoring & Logging

### Application Monitoring

```bash
# Health check endpoint
curl https://api.pjtaudi.bot/health

# Metrics (if Prometheus enabled)
curl https://api.pjtaudi.bot/metrics
```

### Log Aggregation

**Using ELK Stack**:
1. Logs collected via Filebeat
2. Aggregated in Elasticsearch
3. Visualized in Kibana

**Using CloudWatch** (AWS):
```bash
# View logs
aws logs tail /aws/ecs/pjtaudi-api --follow
```

### Alerting

Set up alerts for:
- Health check failures
- Error rate > 1%
- Response time > 1s
- Database connection errors
- Redis connection errors
- Disk usage > 80%
- Memory usage > 85%

## Scaling Strategies

### Horizontal Scaling
```bash
# Increase API replicas
kubectl scale deployment pjtaudi-api --replicas=5

# Auto-scaling based on CPU
kubectl autoscale deployment pjtaudi-api --min=2 --max=10 \
  --cpu-percent=70
```

### Database Scaling
- Use managed PostgreSQL service (RDS, Cloud SQL)
- Enable read replicas for reporting
- Connection pooling (PgBouncer)
- Query optimization and indexing

### Cache Scaling
- Redis Cluster for distributed caching
- Redis Sentinel for HA
- Consistent hashing for cache distribution

## Backup & Disaster Recovery

### Database Backup

```bash
# Automated backups (daily)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Verify backups
pg_restore -d test_db /backups/db-latest.sql.gz
```

### Redis Persistence

```bash
# Enable AOF (Append Only File)
appendonly yes
appendfilename "appendonly.aof"

# Create backup
redis-cli --rdb /backups/dump.rdb
```

## Rollback Procedure

### If Deployment Fails

```bash
# Kubernetes rollback
kubectl rollout history deployment/pjtaudi-api
kubectl rollout undo deployment/pjtaudi-api --to-revision=2

# Docker Compose
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d --build
```

## Upgrade Procedure

### Zero-Downtime Deployment

1. **Prepare new version**
   - Build and test locally
   - Run full test suite
   - Build Docker image

2. **Deploy new version**
   - Push image to registry
   - Update deployment manifest
   - Apply changes: `kubectl apply -f deployment.yaml`

3. **Monitor rollout**
   - `kubectl rollout status deployment/pjtaudi-api`
   - Monitor logs and metrics
   - Verify health checks

4. **Rollback if needed**
   - `kubectl rollout undo deployment/pjtaudi-api`

## Post-Deployment Verification

```bash
# Check service health
curl https://api.pjtaudi.bot/health

# Check database connectivity
curl https://api.pjtaudi.bot/health/db

# Check Redis connectivity
curl https://api.pjtaudi.bot/health/redis

# Verify bots are connected
curl https://api.pjtaudi.bot/bots

# Test a command
curl -X POST https://api.pjtaudi.bot/commands/ping/execute
```

## Performance Optimization

### Database
- Enable query logging in slow query log
- Add indexes on frequently queried columns
- Analyze and optimize expensive queries
- Monitor connection pool usage

### Cache
- Increase Redis memory as needed
- Monitor cache hit ratio
- Implement cache warming strategy
- Use appropriate TTLs

### API
- Enable gzip compression
- Implement request caching
- Optimize response payloads
- Monitor response times

## Security Hardening

- [ ] Enable HTTPS/TLS
- [ ] Setup WAF (Web Application Firewall)
- [ ] Enable rate limiting at proxyConcurrency level
- [ ] Setup DDoS protection
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Vulnerability scanning (Trivy, Snyk)
- [ ] Secrets rotation policy

## Support & Troubleshooting

### Common Issues

**"Connection refused" to database**
- Verify DATABASE_URL is correct
- Check PostgreSQL pod/container health
- Verify network policies

**High memory usage**
- Check for memory leaks (Node diagnostics)
- Reduce cache TTL
- Increase container memory limits

**Bot not responding**
- Check bot service status
- Verify API connectivity
- Check bot logs for errors
- Test health endpoints

---

**Last Updated**: 2024
**Version**: 1.0.0
