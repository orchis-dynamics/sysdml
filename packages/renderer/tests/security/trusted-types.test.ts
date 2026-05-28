// @vitest-environment happy-dom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { installTrustedTypesPolicy, isAllowedWorkerUrl } from "../../src/security/trusted-types.js";

describe("isAllowedWorkerUrl", () => {
  test("accepts a same-origin https assets path", () => {
    expect(isAllowedWorkerUrl("https://demo.example.com/assets/worker-abc.js")).toBe(true);
  });

  test("accepts a vscode-webview-resource asset path", () => {
    expect(isAllowedWorkerUrl("https://abc-def.vscode-webview.net/path/assets/worker-abc.js")).toBe(true);
  });

  test("accepts a relative ./assets path", () => {
    expect(isAllowedWorkerUrl("./assets/worker-abc.js")).toBe(true);
  });

  test("accepts a hashed worker bundle URL with query string", () => {
    expect(isAllowedWorkerUrl("https://demo.example.com/assets/worker-abc.js?t=123")).toBe(true);
  });

  test("rejects http:// from a different host", () => {
    expect(isAllowedWorkerUrl("http://attacker.example.com/evil.js")).toBe(false);
  });

  test("rejects javascript: URLs", () => {
    expect(isAllowedWorkerUrl("javascript:alert(1)")).toBe(false);
  });

  test("rejects data: URLs", () => {
    expect(isAllowedWorkerUrl("data:text/javascript,alert(1)")).toBe(false);
  });

  test("rejects blob: URLs (legacy inline-worker pattern)", () => {
    expect(isAllowedWorkerUrl("blob:https://example.com/abc-def")).toBe(false);
  });

  test("rejects URLs without .js extension", () => {
    expect(isAllowedWorkerUrl("https://demo.example.com/assets/worker")).toBe(false);
  });
});

describe("installTrustedTypesPolicy", () => {
  let originalTrustedTypes: typeof window.trustedTypes | undefined;

  beforeEach(() => {
    originalTrustedTypes = window.trustedTypes;
  });

  afterEach(() => {
    Object.defineProperty(window, "trustedTypes", {
      value: originalTrustedTypes,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  test("is a no-op when trustedTypes is undefined", () => {
    Object.defineProperty(window, "trustedTypes", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => installTrustedTypesPolicy()).not.toThrow();
  });

  test("registers a 'default' policy when trustedTypes is available", () => {
    const createPolicy = vi.fn();
    Object.defineProperty(window, "trustedTypes", {
      value: { createPolicy },
      writable: true,
      configurable: true,
    });
    installTrustedTypesPolicy();
    expect(createPolicy).toHaveBeenCalledWith("default", expect.objectContaining({
      createScriptURL: expect.any(Function),
    }));
  });

  test("the registered createScriptURL accepts allowed URLs", () => {
    let capturedRules: { createScriptURL: (input: string) => string } | undefined;
    Object.defineProperty(window, "trustedTypes", {
      value: {
        createPolicy: (_name: string, rules: typeof capturedRules) => {
          capturedRules = rules;
          return rules;
        },
      },
      writable: true,
      configurable: true,
    });
    installTrustedTypesPolicy();
    expect(capturedRules?.createScriptURL("https://demo.example.com/assets/worker-abc.js"))
      .toBe("https://demo.example.com/assets/worker-abc.js");
  });

  test("the registered createScriptURL rejects untrusted URLs", () => {
    let capturedRules: { createScriptURL: (input: string) => string } | undefined;
    Object.defineProperty(window, "trustedTypes", {
      value: {
        createPolicy: (_name: string, rules: typeof capturedRules) => {
          capturedRules = rules;
          return rules;
        },
      },
      writable: true,
      configurable: true,
    });
    installTrustedTypesPolicy();
    expect(() => capturedRules?.createScriptURL("javascript:alert(1)"))
      .toThrow(/Refused to create script URL/);
  });

  test("swallows the 'policy already exists' error gracefully", () => {
    const createPolicy = vi.fn(() => {
      throw new TypeError("Policy 'default' already exists.");
    });
    Object.defineProperty(window, "trustedTypes", {
      value: { createPolicy },
      writable: true,
      configurable: true,
    });
    expect(() => installTrustedTypesPolicy()).not.toThrow();
  });
});
