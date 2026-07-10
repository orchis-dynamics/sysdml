#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPOSITORY_URL="https://github.com/bpowers/simlin.git"
UPSTREAM_ENGINE_PACKAGE_PATH="src/engine"

REPOSITORY_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
VENDOR_RELATIVE_PATH="packages/vendor/simlin-engine"
VENDOR_DIRECTORY="$REPOSITORY_ROOT/$VENDOR_RELATIVE_PATH"

UPSTREAM_REF="${1:-}"
CLONE_DIRECTORY=""

usage() {
	echo "usage: scripts/update-simlin.sh [upstream-ref]"
	echo ""
	echo "Rebuilds the vendored @simlin/engine package from upstream source:"
	echo "clones $UPSTREAM_REPOSITORY_URL (default branch, or [upstream-ref]),"
	echo "builds the Rust WASM core and TypeScript library, stages the publishable"
	echo "files into $VENDOR_RELATIVE_PATH, then rebuilds and tests @sysdml/simulator"
	echo "against the result. Changes are left uncommitted for review."
	echo ""
	echo "environment:"
	echo "  ALLOW_UNOPTIMIZED_WASM=1   proceed without wasm-opt (larger binaries)"
}

fail() {
	echo "error: $*" >&2
	exit 1
}

step() {
	echo ""
	echo "==> $*"
}

require_command() {
	local command_name="$1"
	local install_hint="$2"
	command -v "$command_name" >/dev/null 2>&1 || fail "'$command_name' not found. $install_hint"
}

check_prerequisites() {
	step "Checking prerequisites"
	require_command git "https://git-scm.com"
	require_command node "https://nodejs.org"
	require_command pnpm "npm install -g pnpm"
	require_command rustup "https://rustup.rs (upstream pins its Rust toolchain via rust-toolchain.toml)"
	require_command cargo "https://rustup.rs"
	if ! command -v wasm-opt >/dev/null 2>&1; then
		if [ "${ALLOW_UNOPTIMIZED_WASM:-0}" != "1" ]; then
			fail "'wasm-opt' not found (brew install binaryen). Without it the vendored WASM is ~30% larger. Set ALLOW_UNOPTIMIZED_WASM=1 to proceed anyway."
		fi
		echo "wasm-opt not found; proceeding with unoptimized WASM (ALLOW_UNOPTIMIZED_WASM=1)"
	fi
}

require_clean_vendor_directory() {
	if [ -n "$(git -C "$REPOSITORY_ROOT" status --porcelain -- "$VENDOR_RELATIVE_PATH")" ]; then
		fail "$VENDOR_RELATIVE_PATH has uncommitted changes; commit or stash them first so this update stays reviewable as a single diff"
	fi
}

clone_upstream() {
	step "Cloning upstream ${UPSTREAM_REF:-default branch}"
	CLONE_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/simlin-update.XXXXXX")"
	trap 'rm -rf "$CLONE_DIRECTORY"' EXIT
	if [ -z "$UPSTREAM_REF" ]; then
		git clone --depth 1 "$UPSTREAM_REPOSITORY_URL" "$CLONE_DIRECTORY"
	else
		git init --quiet "$CLONE_DIRECTORY"
		git -C "$CLONE_DIRECTORY" remote add origin "$UPSTREAM_REPOSITORY_URL"
		git -C "$CLONE_DIRECTORY" fetch --depth 1 origin "$UPSTREAM_REF"
		git -C "$CLONE_DIRECTORY" checkout --quiet FETCH_HEAD
	fi
	UPSTREAM_COMMIT="$(git -C "$CLONE_DIRECTORY" rev-parse HEAD)"
	echo "upstream commit: $UPSTREAM_COMMIT"
}

build_engine() {
	step "Installing engine dependencies"
	(cd "$CLONE_DIRECTORY" && pnpm install --filter @simlin/engine)
	step "Building engine (Rust WASM core + TypeScript, several minutes on a cold cargo cache)"
	(cd "$CLONE_DIRECTORY/$UPSTREAM_ENGINE_PACKAGE_PATH" && bash build.sh)
}

read_engine_package_field() {
	local field_expression="$1"
	node --print "JSON.stringify(require(process.argv[1])$field_expression)" \
		"$CLONE_DIRECTORY/$UPSTREAM_ENGINE_PACKAGE_PATH/package.json"
}

stage_vendor_directory() {
	step "Staging built package into $VENDOR_RELATIVE_PATH"
	rm -rf "$VENDOR_DIRECTORY"
	mkdir -p "$VENDOR_DIRECTORY"

	local built_engine_directory="$CLONE_DIRECTORY/$UPSTREAM_ENGINE_PACKAGE_PATH"
	local publishable_entries
	publishable_entries="$(node --print "require(process.argv[1]).files.join('\n')" "$built_engine_directory/package.json")"

	local entry
	while IFS= read -r entry; do
		[ -e "$built_engine_directory/$entry" ] || fail "package.json 'files' entry '$entry' missing from build output"
		mkdir -p "$VENDOR_DIRECTORY/$(dirname "$entry")"
		cp -R "$built_engine_directory/$entry" "$VENDOR_DIRECTORY/$entry"
		echo "  vendored $entry"
	done <<<"$publishable_entries"

	cp "$CLONE_DIRECTORY/LICENSE" "$VENDOR_DIRECTORY/LICENSE"
	write_vendored_package_json "$built_engine_directory/package.json"
	write_provenance_file
}

write_vendored_package_json() {
	local upstream_package_json="$1"
	node --eval '
		const fs = require("fs");
		const [sourcePath, destinationPath] = process.argv.slice(1);
		const packageJson = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
		delete packageJson.scripts;
		delete packageJson.devDependencies;
		packageJson.private = true;
		fs.writeFileSync(destinationPath, JSON.stringify(packageJson, null, 2) + "\n");
	' "$upstream_package_json" "$VENDOR_DIRECTORY/package.json"
	echo "  vendored package.json (scripts and devDependencies removed, marked private)"
}

write_provenance_file() {
	local engine_version
	engine_version="$(read_engine_package_field ".version" | tr -d '"')"
	cat >"$VENDOR_DIRECTORY/VENDORED.md" <<-EOF
		# Vendored @simlin/engine

		Built from source and vendored by \`scripts/update-simlin.sh\`. Do not edit
		by hand — rerun the script to update.

		- Upstream: $UPSTREAM_REPOSITORY_URL (\`$UPSTREAM_ENGINE_PACKAGE_PATH\`)
		- Commit: $UPSTREAM_COMMIT
		- Package version: $engine_version
		- Vendored on: $(date -u +%Y-%m-%d)
		- License: Apache-2.0 (see LICENSE)
		- Local transformations: \`scripts\` and \`devDependencies\` removed from
		  package.json so workspace-wide \`pnpm -r\` commands and installs skip
		  the upstream build/test tooling; \`private: true\` added so this vendored
		  copy is never published to npm (it is bundled into \`@sysdml/simulator\`).
	EOF
	echo "  wrote VENDORED.md (commit $UPSTREAM_COMMIT)"
}

verify_against_workspace() {
	step "Refreshing workspace install"
	(cd "$REPOSITORY_ROOT" && pnpm install)
	step "Building @sysdml/simulator and its dependencies against the new engine"
	(cd "$REPOSITORY_ROOT" && pnpm --filter "@sysdml/simulator..." run build)
	step "Running @sysdml/simulator tests"
	(cd "$REPOSITORY_ROOT" && pnpm --filter "@sysdml/simulator" run test)
	step "Verifying the publishable bundle has no unresolved @simlin/engine specifier"
	verify_bundle_is_self_contained
}

verify_bundle_is_self_contained() {
	local node_bundle="$REPOSITORY_ROOT/packages/simulator/dist/node/index.js"
	local browser_bundle="$REPOSITORY_ROOT/packages/simulator/dist/browser/index.js"
	for bundle in "$node_bundle" "$browser_bundle"; do
		[ -f "$bundle" ] || fail "expected bundled output missing: $bundle (did the simulator build run?)"
		if grep -Eq 'from[[:space:]]*["'"'"']@simlin/engine' "$bundle"; then
			fail "bare @simlin/engine specifier survived in $bundle — bundling is incomplete"
		fi
	done
	echo "  bundles are self-contained (no bare @simlin/engine specifier)"
}

print_summary() {
	step "Done — review and commit on a feature branch"
	git -C "$REPOSITORY_ROOT" status --short -- "$VENDOR_RELATIVE_PATH" pnpm-lock.yaml | head -30
	echo ""
	echo "vendored upstream commit $UPSTREAM_COMMIT"
	echo "review with: git diff $VENDOR_RELATIVE_PATH"
}

main() {
	if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
		usage
		exit 0
	fi
	check_prerequisites
	require_clean_vendor_directory
	clone_upstream
	build_engine
	stage_vendor_directory
	verify_against_workspace
	print_summary
}

main "$@"
