.DEFAULT_GOAL := help
SHELL := /bin/bash

# Source nvm so we get the right Node version (from .nvmrc) and pnpm
NVM_INIT := source "$$NVM_DIR/nvm.sh" --no-use && nvm use --silent

# SSM namespace — all config lives under this prefix in AWS Parameter Store
SSM_NAMESPACE ?= /enduro-challenge

.PHONY: help install build clean dev config synth diff deploy deploy-db deploy-api deploy-frontend

help:
	@awk 'BEGIN {FS = ":.*## "; print "Usage: make <target>\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2} /^## / {print substr($$0, 4)}' $(MAKEFILE_LIST)

## ── Setup ────────────────────────────────────────────────────────────────────

install: ## Install dependencies (nvm + pnpm)
	$(NVM_INIT) && pnpm install

build: install ## Build all packages
	$(NVM_INIT) && pnpm -r build

clean: ## Remove build artifacts
	$(NVM_INIT) && pnpm -r run clean

## ── Config ───────────────────────────────────────────────────────────────────

config: ## Fetch frontend env from SSM Parameter Store
	./scripts/fetch-config.sh $(SSM_NAMESPACE)

## ── Local Development ────────────────────────────────────────────────────────

dev: install ## Start the web app dev server
	$(NVM_INIT) && pnpm --filter web dev

## ── AWS Deploy ───────────────────────────────────────────────────────────────

synth: build ## Synthesize CDK stacks
	$(NVM_INIT) && cd infra && npx cdk synth

diff: build ## Show CDK diff
	$(NVM_INIT) && cd infra && npx cdk diff

deploy: build ## Deploy all CDK stacks
	$(NVM_INIT) && cd infra && npx cdk deploy --all --require-approval never

deploy-db: build ## Deploy the database stack
	$(NVM_INIT) && cd infra && npx cdk deploy EnduroDatabase --require-approval never

deploy-api: build ## Deploy the API stack
	$(NVM_INIT) && cd infra && npx cdk deploy EnduroApi --require-approval never

deploy-frontend: config build ## Deploy the frontend stack (fetches config first)
	$(NVM_INIT) && cd infra && npx cdk deploy EnduroFrontend --require-approval never
