// 구형 iOS WebView(카카오톡 인앱, iOS 17.3 이하 등)에는 AbortSignal.any / AbortSignal.timeout이 없다.
// 없으면 첫 sync 요청에서 예외가 나 busy가 풀리지 않아 로딩이 멈춘다. 최신 브라우저에서는 아무것도 하지 않는다.
if (typeof AbortSignal !== "undefined") {
  if (typeof AbortSignal.timeout !== "function") {
    AbortSignal.timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(new DOMException("TimeoutError", "TimeoutError")), ms); return c.signal; };
  }
  if (typeof AbortSignal.any !== "function") {
    AbortSignal.any = (signals) => {
      const c = new AbortController();
      for (const s of signals) {
        if (!s) continue;
        if (s.aborted) { c.abort(s.reason); break; }
        s.addEventListener("abort", () => c.abort(s.reason), { once: true });
      }
      return c.signal;
    };
  }
}
