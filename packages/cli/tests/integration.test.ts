import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const binary = resolve(here, "../dist/src/index.js");
const fixtures = resolve(here, "fixtures");

function runCli(...args: string[]): {
	stdout: string;
	stderr: string;
	status: number;
} {
	const result = spawnSync("node", [binary, ...args], { encoding: "utf8" });
	return {
		stdout: result.stdout,
		stderr: result.stderr,
		status: result.status ?? -1,
	};
}

describe("sysdml CLI (built binary)", () => {
	beforeAll(() => {
		const built = spawnSync("node", [binary, "--help"], { encoding: "utf8" });
		if (built.status !== 0) {
			throw new Error(
				`CLI binary not built. Run 'pnpm --filter @sysdml/cli build' first.`,
			);
		}
	});

	it("prints usage on --help", () => {
		const { stdout, status } = runCli("--help");
		expect(status).toBe(0);
		expect(stdout).toContain("Usage:");
	});

	it("runs sysdml parse on a valid fixture", () => {
		const { stdout, stderr, status } = runCli(
			"parse",
			`${fixtures}/simple.sysdml`,
		);
		expect(status).toBe(0);
		expect(stderr).toBe("");
		const parsed = JSON.parse(stdout);
		expect(parsed.type).toBe("File");
	});

	it("runs sysdml simulate with default JSON output", () => {
		const { stdout, stderr, status } = runCli(
			"simulate",
			`${fixtures}/simple.sysdml`,
		);
		expect(status).toBe(0);
		expect(stderr).toBe("");
		const parsed = JSON.parse(stdout);
		expect(parsed.rows).toHaveLength(3);
	});

	it("runs sysdml simulate --csv", () => {
		const { stdout, status } = runCli(
			"simulate",
			`${fixtures}/simple.sysdml`,
			"--csv",
		);
		expect(status).toBe(0);
		expect(stdout).toBe("time,population\n0,100\n1,100\n2,100\n");
	});

	it("exits 1 with stderr diagnostics on compile error", () => {
		const { stdout, stderr, status } = runCli(
			"simulate",
			`${fixtures}/compile-error.sysdml`,
		);
		expect(status).toBe(1);
		expect(stdout).toBe("");
		expect(stderr).toContain("--- Diagnostics ---");
	});

	it("exits 1 with a clear message when simulating a cld model", () => {
		const { stdout, stderr, status } = runCli(
			"simulate",
			`${fixtures}/cld.sysdml`,
		);
		expect(status).toBe(1);
		expect(stdout).toBe("");
		expect(stderr).toContain("Cannot simulate 'feedback'");
	});

	it("exits 1 with USAGE on stderr when no args are given", () => {
		const { stdout, stderr, status } = runCli();
		expect(status).toBe(1);
		expect(stdout).toBe("");
		expect(stderr).toContain("Usage:");
	});

	it("exits 1 on unknown subcommand", () => {
		const { stderr, status } = runCli("foobar");
		expect(status).toBe(1);
		expect(stderr).toContain("Unknown subcommand: foobar");
	});

	it("exits 1 with clean message when input file does not exist", () => {
		const { stdout, stderr, status } = runCli(
			"simulate",
			"/tmp/definitely-does-not-exist-12345.sysdml",
		);
		expect(status).toBe(1);
		expect(stdout).toBe("");
		expect(stderr).not.toContain("Fatal:");
		expect(stderr).toContain("Cannot read file");
	});
});
