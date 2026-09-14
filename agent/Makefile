.PHONY: setup start-services dev dev-all stop-services

MODEL = qwen2.5:1.5b

setup:
	@echo "📦 Installing Redis and Ollama..."
	@which redis-server > /dev/null || (sudo apt-get update && sudo apt-get install -y redis-server)
	@which ollama > /dev/null || (curl -fsSL https://ollama.com/install.sh | sh)
	@echo "🚀 Starting services..."
	@sudo systemctl start redis || true
	@sudo systemctl start ollama || true
	@echo "🧠 Pulling Ollama model ($(MODEL))..."
	@ollama pull $(MODEL)
	@echo "📥 Installing pnpm dependencies..."
	@if [ -d agent ]; then cd agent && pnpm install; else pnpm install; fi
	@echo "✅ Setup complete!"

start-services:
	@echo "🚀 Starting Redis and Ollama services..."
	@sudo systemctl start redis || true
	@sudo systemctl start ollama || true

stop-services:
	@echo "🛑 Stopping Redis and Ollama services..."
	@sudo systemctl stop redis || true
	@sudo systemctl stop ollama || true

dev: start-services
	@echo "🚀 Starting agent development server..."
	@if [ -d agent ]; then cd agent && pnpm run dev; else pnpm run dev; fi

dev-all: start-services
	@echo "🚀 Starting all client and server processes..."
	@if [ -d agent ]; then cd agent && pnpm run dev:all; else pnpm run dev:all; fi