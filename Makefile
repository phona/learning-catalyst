.PHONY: lint format pylint help install-dev

# Default paths if not provided
DEFAULT_PATHS = src tests

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Usage examples:"
	@echo "  make lint                    # Lint default paths (src tests)"
	@echo "  make lint src                # Lint only src directory"
	@echo "  make lint src/file.py        # Lint specific file"
	@echo "  make format src tests        # Format specific paths"

install-dev: ## Install development dependencies
	poetry install

lint: ## Run all linting tools (paths can be provided after command, e.g., make lint src)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive $(DEFAULT_PATHS); \
		isort $(DEFAULT_PATHS); \
		black $(DEFAULT_PATHS); \
		flake8 $(DEFAULT_PATHS); \
		pylint $(DEFAULT_PATHS); \
		pyright $(DEFAULT_PATHS); \
	else \
		autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive $(filter-out $@,$(MAKECMDGOALS)); \
		isort $(filter-out $@,$(MAKECMDGOALS)); \
		black $(filter-out $@,$(MAKECMDGOALS)); \
		flake8 $(filter-out $@,$(MAKECMDGOALS)); \
		pylint $(filter-out $@,$(MAKECMDGOALS)); \
		pyright $(filter-out $@,$(MAKECMDGOALS)); \
	fi

format: ## Format code only (paths can be provided after command, e.g., make format src)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive $(DEFAULT_PATHS); \
		isort $(DEFAULT_PATHS); \
		black $(DEFAULT_PATHS); \
	else \
		autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive $(filter-out $@,$(MAKECMDGOALS)); \
		isort $(filter-out $@,$(MAKECMDGOALS)); \
		black $(filter-out $@,$(MAKECMDGOALS)); \
	fi

check-flake8: ## Check code style with flake8 only (paths can be provided after command)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		flake8 $(DEFAULT_PATHS); \
	else \
		flake8 $(filter-out $@,$(MAKECMDGOALS)); \
	fi

check-pylint: ## Check code with pylint only (paths can be provided after command)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		pylint $(DEFAULT_PATHS); \
	else \
		pylint $(filter-out $@,$(MAKECMDGOALS)); \
	fi

pylint: ## Run pylint only (paths can be provided after command)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		pylint $(DEFAULT_PATHS); \
	else \
		pylint $(filter-out $@,$(MAKECMDGOALS)); \
	fi

check-black: ## Check code formatting with black only (paths can be provided after command)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		black --check $(DEFAULT_PATHS); \
	else \
		black --check $(filter-out $@,$(MAKECMDGOALS)); \
	fi

check-isort: ## Check import sorting with isort only (paths can be provided after command)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		isort --check-only $(DEFAULT_PATHS); \
	else \
		isort --check-only $(filter-out $@,$(MAKECMDGOALS)); \
	fi

# Prevent make from interpreting paths as targets
%:
	@: