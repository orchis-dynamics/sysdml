"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGINE_PUBLIC_PATH_GLOBAL = void 0;
exports.isCrossOrigin = isCrossOrigin;
exports.resolvePublicPathOverride = resolvePublicPathOverride;
exports.workerTrampolineSource = workerTrampolineSource;
exports.planWorkerCreation = planWorkerCreation;
exports.spawnWithTrampoline = spawnWithTrampoline;
exports.ENGINE_PUBLIC_PATH_GLOBAL = '__simlin_engine_public_path__';
function isCrossOrigin(workerUrl, pageOrigin) {
    if (!pageOrigin || pageOrigin === 'null') {
        return false;
    }
    let parsed;
    try {
        parsed = new URL(workerUrl);
    }
    catch {
        return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
    }
    return parsed.origin !== pageOrigin;
}
function resolvePublicPathOverride(publicPath, workerUrl) {
    if (publicPath === undefined || publicPath === '') {
        return undefined;
    }
    try {
        return new URL(publicPath, workerUrl).href;
    }
    catch {
        return undefined;
    }
}
function workerTrampolineSource(absUrl, workerType, publicPathOverride) {
    const urlLiteral = JSON.stringify(absUrl);
    if (workerType === 'module') {
        return `import ${urlLiteral};\n`;
    }
    const lines = [];
    if (publicPathOverride !== undefined) {
        lines.push(`self[${JSON.stringify(exports.ENGINE_PUBLIC_PATH_GLOBAL)}] = ${JSON.stringify(publicPathOverride)};`);
    }
    lines.push(`importScripts(${urlLiteral});`);
    return `${lines.join('\n')}\n`;
}
function planWorkerCreation(args) {
    const { workerUrl, pageOrigin, workerType, publicPath } = args;
    if (!isCrossOrigin(workerUrl, pageOrigin)) {
        return { kind: 'direct' };
    }
    const override = workerType === 'classic' ? resolvePublicPathOverride(publicPath, workerUrl) : undefined;
    return { kind: 'trampoline', source: workerTrampolineSource(workerUrl, workerType, override) };
}
function spawnWithTrampoline(globalScope, spawn, env, urlFactory = URL) {
    const NativeWorker = globalScope.Worker;
    if (typeof NativeWorker !== 'function') {
        return { worker: spawn(), blobUrl: null };
    }
    const captured = { spawned: null };
    const InterceptingWorker = function (url, options) {
        const plan = planWorkerCreation({
            workerUrl: String(url),
            pageOrigin: env.pageOrigin,
            workerType: options?.type === 'module' ? 'module' : 'classic',
            publicPath: env.publicPath,
        });
        if (plan.kind === 'direct') {
            const worker = new NativeWorker(url, options);
            captured.spawned = { worker, blobUrl: null };
            return worker;
        }
        const blobUrl = urlFactory.createObjectURL(new Blob([plan.source], { type: 'text/javascript' }));
        try {
            const worker = new NativeWorker(blobUrl, options);
            captured.spawned = { worker, blobUrl };
            return worker;
        }
        catch (err) {
            urlFactory.revokeObjectURL(blobUrl);
            throw err;
        }
    };
    globalScope.Worker = InterceptingWorker;
    let worker;
    try {
        worker = spawn();
    }
    finally {
        globalScope.Worker = NativeWorker;
    }
    const intercepted = captured.spawned;
    if (intercepted !== null && intercepted.worker === worker) {
        return intercepted;
    }
    return { worker, blobUrl: intercepted !== null ? intercepted.blobUrl : null };
}
//# sourceMappingURL=worker-trampoline.js.map