NPM_BIN ?= $(shell which npm 2> /dev/null)
VERSION ?= $(shell jq -r '.version' package.json)
DOCKER_BIN ?= $(shell which podman 2> /dev/null)
RENOVATE_REPOSITORIES ?= seb-schulz/price-pivot
LOG_LEVEL ?= info

-include Makefile.variables

export

.PHONY: help
help:		          ## Display this help
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//'



.PHONY: build
build:                    ## Bundle source to distribution package
	$(NPM_BIN) run $@

.PHONY: clean
clean:                    ## Tidy up distribution package
	rm -rf dist

.PHONY: release
release:                  ## Create release page on Github and upload distribution package
	./scripts/$@.sh

.PHONY: install-npm-dependencies
install-npm-dependencies: ## Install NPM packages
	npm ci || true

.PHONY: check-updates
check-updates:            ## Check for updates and create pull-requests for outdated packages
	./scripts/$@.sh
