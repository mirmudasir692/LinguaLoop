.PHONY: install-redis run-redis stop-redis restart-redis

CONTAINER_NAME = mastra-redis
REDIS_PORT = 6379

install-redis:
	@echo "📦 Pulling Redis Docker image..."
	@docker pull redis:alpine

run-redis:
	@echo "🚀 Starting Redis container..."
	@docker run -d --name $(CONTAINER_NAME) -p $(REDIS_PORT):6379 redis:alpine 2>/dev/null || docker start $(CONTAINER_NAME)
	@echo "✅ Redis is running on localhost:$(REDIS_PORT)"

stop-redis:
	@echo "🛑 Stopping Redis container..."
	@docker stop $(CONTAINER_NAME)

restart-redis:
	@echo "🔄 Restarting Redis container..."
	@docker restart $(CONTAINER_NAME)
start-dev:
	@sudo systemctl start redis
	@sudo systemctl start ollama