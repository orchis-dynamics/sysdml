// blob: URLs are accepted because they're the only way to construct a Worker
// in the VS Code webview (whose iframe origin `vscode-webview://[guid]` is
// different from where resources are served, so cross-origin URLs are rejected
// by the Worker constructor). Only same-origin code can call
// URL.createObjectURL, so an attacker would already need script execution to
// produce a blob: URL — accepting them doesn't widen the attack surface.
const ALLOWED_WORKER_URL_PATTERNS: ReadonlyArray<RegExp> = [
  /^blob:/,
  /^https?:\/\/[^/]+\/[^?]*assets\/[A-Za-z0-9._-]+\.js(\?.*)?$/,
  /^vscode-webview-resource:\/\/[^/]+\/[^?]*\/assets\/[A-Za-z0-9._-]+\.js(\?.*)?$/,
  /^\.{0,2}\/[^?]*\.js(\?.*)?$/,
];

export function isAllowedWorkerUrl(input: string): boolean {
  return ALLOWED_WORKER_URL_PATTERNS.some((pattern) => pattern.test(input));
}

interface TrustedTypesPolicy {
  createScriptURL(input: string): string;
}

interface TrustedTypesFactory {
  createPolicy(
    name: string,
    rules: { createScriptURL?: (input: string) => string },
  ): TrustedTypesPolicy;
}

declare global {
  interface Window {
    trustedTypes?: TrustedTypesFactory;
  }
}

export function installTrustedTypesPolicy(): void {
  if (typeof window === "undefined") return;
  const factory = window.trustedTypes;
  if (!factory || typeof factory.createPolicy !== "function") return;

  try {
    factory.createPolicy("default", {
      createScriptURL: (input: string) => {
        if (isAllowedWorkerUrl(input)) return input;
        throw new TypeError(
          `Refused to create script URL from untrusted source: ${input}`,
        );
      },
    });
  } catch (error) {
    if (
      error instanceof TypeError &&
      /already exists/i.test(error.message)
    ) {
      return;
    }
    throw error;
  }
}
