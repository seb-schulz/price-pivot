NPM_BIN ?= $(shell which npm 2> /dev/null)
VERSION ?= $(shell jq -r '.version' package.json)
DOCKER_BIN ?= $(shell which podman 2> /dev/null)
RENOVATE_REPOSITORIES ?= seb-schulz/price-pivot
LOG_LEVEL ?= info

-include Makefile.variables

export

.PHONY: build
build:
	$(NPM_BIN) run $@

.PHONY: clean
clean:
	rm -rf dist

.PHONY: release
release:
	./scripts/$@.sh

.PHONY: install-npm-dependencies
install-npm-dependencies:
	npm ci || true

.PHONY: check-updates
check-updates:
	./scripts/$@.sh
