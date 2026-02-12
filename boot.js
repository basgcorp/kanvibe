/**
 * Next.js 커스텀 서버 부트스트랩.
 * tsx를 통해 server.ts를 로드하기 전에 AsyncLocalStorage를 전역에 등록하여
 * Next.js 16의 런타임 요구사항을 충족한다.
 */
const { AsyncLocalStorage } = require("node:async_hooks");
globalThis.AsyncLocalStorage = AsyncLocalStorage;
require("tsx/cjs");
require("./server.ts");
