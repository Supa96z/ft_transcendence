.PHONY: all install build start dev frontend-dev backend-dev test clean tailwind

docker:
	cd backend/ && npm rebuild better-sqlite3
	cd ../
	docker build -t transcendence-app . && docker run -p 3000:3000 transcendence-app

# Install all dependencies
install:
	@echo "Installing all dependencies..."
	@./install.sh

# Build/compile frontend (TypeScript) and Tailwind CSS
build: compile-ts tailwind

compile-ts:
	@echo "Compiling frontend TypeScript..."
	@cd frontend && npx tsc

tailwind:
	@echo "Building Tailwind CSS..."
	@cd frontend && npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css

# Start the whole project (backend serves frontend)
start: build
	@echo "Starting backend (serves frontend)..."
	@cd backend && npm run dev

# Development: run frontend and backend separately (optional)
frontend-dev:
	@echo "Starting frontend dev server..."
	@cd frontend && npm run start

backend-dev:
	@echo "Starting backend in development mode..."
	@cd backend && npm run dev

dev: build
	@echo "Starting both frontend and backend in dev mode (use in separate terminals)"
	@echo "Run 'make frontend-dev' and 'make backend-dev' in separate terminals."

# Run tests for both frontend and backend
test:
	@echo "Running frontend tests..."
	@cd frontend && npm test || true
	@echo "Running backend tests..."
	@cd backend && npm test || true

# Clean node_modules and compiled files
clean:
	@echo "Cleaning backend dependencies..."
	@rm -rf backend/node_modules
	@echo "Cleaning frontend dependencies..."
	@rm -rf frontend/node_modules
	@echo "Cleaning frontend compiled files..."
	@rm -rf frontend/dist

# Default target: install, build, and start
all: install start
