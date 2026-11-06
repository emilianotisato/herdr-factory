# The gate is `make gate`. The inner loop is `make inner`.
# docs/reference/verification.md says which tier proves what.
.PHONY: gate inner setup deps format format-write lint shell mods types test test-quiet

gate: deps format lint shell mods types test
inner: format-write lint shell mods types test-quiet

setup:
	npm ci
deps:
	@scripts/gate/deps.sh
format:
	@scripts/gate/format.sh check
format-write:
	@scripts/gate/format.sh write
lint:
	@scripts/gate/lint.sh
shell:
	@scripts/gate/shell.sh
mods:
	@scripts/gate/mods.sh
types:
	@scripts/gate/types.sh
test:
	@scripts/gate/test.sh
test-quiet:
	@scripts/gate/test.sh quiet
