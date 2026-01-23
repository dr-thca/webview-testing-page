import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const formatPayload = (payload) => {
  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
};

const formatPretty = (payload) => {
  if (payload == null) {
    return "null";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const getTimestamp = () => new Date().toISOString();

function App() {
  const [status, setStatus] = useState("Idle");
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(getTimestamp());
  const [customMessage, setCustomMessage] = useState(
    JSON.stringify({ event_name: "custom", payload: { hello: "native" } }, null, 2),
  );
  const [customIsJson, setCustomIsJson] = useState(true);
  const [logs, setLogs] = useState([]);
  const [showLog, setShowLog] = useState(true);
  const [navigateUrl, setNavigateUrl] = useState(
    "https://www.dr.dk/nyheder/vejret/reels/russisk-halvoe-paa-vej-tilbage-til-hverdagen-efter-snedommedag",
  );
  const [navigateTime, setNavigateTime] = useState("10");
  const [navigateMuted, setNavigateMuted] = useState(false);
  const readInjectedObject = () => {
    let candidate = window.__APP_CONTEXT__ ?? null;

    if (candidate == null) {
      alert("No injected app context found");
      candidate = "No injected app context found";
    }
    return candidate;
  };

  const [injectedObject, setInjectedObject] = useState(() =>
    readInjectedObject(),
  );
  const [injectedSnapshot, setInjectedSnapshot] = useState(() =>
    formatPretty(readInjectedObject()),
  );
  const [injectedAt, setInjectedAt] = useState(() => getTimestamp());
  const [appContext, setAppContext] = useState(null);
  const [appContextSnapshot, setAppContextSnapshot] = useState("Waiting...");
  const [appContextAt, setAppContextAt] = useState(() => getTimestamp());

  const appendLog = (source, payload) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: getTimestamp(),
        source,
        payload: formatPayload(payload),
      },
    ]);
  };

  const updateStatus = (nextStatus) => {
    setStatus(String(nextStatus));
    setStatusUpdatedAt(getTimestamp());
  };

  const refreshInjectedObject = useCallback(() => {
    const candidate = readInjectedObject();
    setInjectedObject(candidate);
    setInjectedSnapshot(formatPretty(candidate));
    setInjectedAt(getTimestamp());
  }, []);

  const coerceNullableNumber = (value) => {
    if (value === "" || value == null) {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  };



  const sendCustomToNative = () => {
    const raw = customMessage.trim();
    let payloadToSend = raw;

    if (customIsJson) {
      try {
        payloadToSend = JSON.parse(raw);
      } catch (error) {
        appendLog("error", `Invalid JSON: ${error.message}`);
        updateStatus("Invalid JSON");
        return;
      }
    }

    const serialized =
      typeof payloadToSend === "string"
        ? payloadToSend
        : JSON.stringify(payloadToSend);

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(serialized);
    } else {
      window.postMessage(serialized, "*");
    }

    appendLog("postMessage", serialized);
  };

  const sendNavigateToNative = () => {
    const payload = {
      event_name: "navigate",
      payload: {
        absoluteUrl: navigateUrl.trim(),
        currentTimeSeconds: coerceNullableNumber(navigateTime),
        muted: navigateMuted,
      },
    };

    const serialized = JSON.stringify(payload);

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(serialized);
    } else {
      window.postMessage(serialized, "*");
    }

    appendLog("bridge:navigate", serialized);
  };

  useEffect(() => {
    const handler = (event) => {
      const { data } = event;
      appendLog("message", data);

      let parsed = null;
      if (typeof data === "string") {
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
      } else if (data && typeof data === "object") {
        parsed = data;
      }

      if (parsed?.event_name === "appContextChanged") {
        setAppContext(parsed.payload ?? null);
        setAppContextSnapshot(formatPretty(parsed.payload ?? null));
        setAppContextAt(getTimestamp());
        updateStatus("App context updated");
      }
    };

    window.addEventListener("message", handler);
    document.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
      document.removeEventListener("message", handler);
    };
  }, []);

  const sendWebViewReady = useCallback(() => {
    const payload = JSON.stringify({ event_name: "webviewReady", payload: {} });

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(payload);
    } else {
      window.postMessage(payload, "*");
    }

    appendLog("bridge:webviewReady", payload);
    updateStatus("WebView ready");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      sendWebViewReady();
    }, 0);

    return () => clearTimeout(timer);
  }, [sendWebViewReady]);

  useEffect(() => {
    window.__setStatus = updateStatus;
    window.__appendLog = (payload) => appendLog("injected", payload);
    window.__refreshInjectedObject = refreshInjectedObject;

    return () => {
      delete window.__setStatus;
      delete window.__appendLog;
      delete window.__refreshInjectedObject;
    };
  }, [refreshInjectedObject]);

  const lastLog = useMemo(() => logs[logs.length - 1], [logs]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Local WebView Playground</h1>
          <p className="subhead">
            Run at <span className="mono">http://localhost:3000</span>. Use this
            for bridge events, injected app context, and WebView debugging.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>Injected app context (initial)</h2>
        <div className="log-meta">
          <div>Source: window.__APP_CONTEXT__</div>
          <div>Type: {typeof injectedObject}</div>
          <div>Last refreshed: {injectedAt}</div>
        </div>
        <div className="actions">
          <button type="button" onClick={refreshInjectedObject}>
            Refresh app context
          </button>
        </div>
        <pre className="log-output">{injectedSnapshot}</pre>
      </section>
      <div className="log-meta">
        Event schemas: nyhedsapp repo →
        <span className="mono">src/schemas/webview-bridge-message.schema.ts</span>
      </div>
      <section className="panel">
        <h2>appContextChanged (live)</h2>
        <div className="log-meta">
          <div>Source: appContextChanged</div>
          <div>Type: {typeof appContext}</div>
          <div>Last updated: {appContextAt}</div>
        </div>
        <pre className="log-output">{appContextSnapshot}</pre>
      </section>
      <section className="panel">
        <h2>Message log</h2>
        <div id="last-message" className="log-meta">
          {lastLog
            ? `Last event: ${lastLog.time} (${lastLog.source})`
            : "No messages yet."}
        </div>
        <div className="actions">
          <button type="button" onClick={() => setShowLog((prev) => !prev)}>
            {showLog ? "Hide" : "Show"} message log
          </button>
          <button type="button" onClick={() => setLogs([])}>
            Clear message log
          </button>
        </div>
        {showLog ? (
          <pre id="log-output" className="log-output">
            {logs.length
              ? logs
                  .map(
                    (entry) =>
                      `[${entry.time}] ${entry.source}: ${entry.payload}`,
                  )
                  .join("\n")
              : "Waiting for messages..."}
          </pre>
        ) : (
          <div className="log-output">Log hidden.</div>
        )}
      </section>

        <section className="panel">
          <h2>Navigate command</h2>
          <p className="panel-subhead">
            Sends the DR bridge payload for native navigation handling.
          </p>
          <div className="grid">
            <div className="field">
              <label htmlFor="navigate-url">Absolute URL</label>
              <input
                id="navigate-url"
                value={navigateUrl}
                onChange={(event) => setNavigateUrl(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="navigate-time">Current time seconds</label>
              <input
                id="navigate-time"
                placeholder="Optional"
                value={navigateTime}
                onChange={(event) => setNavigateTime(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="navigate-muted">Muted</label>
              <select
                id="navigate-muted"
                value={navigateMuted ? "true" : "false"}
                onChange={(event) => setNavigateMuted(event.target.value === "true")}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
            <div className="actions">
              <button type="button" onClick={sendNavigateToNative}>
                Send navigate command
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavigateUrl(
                    "https://www.dr.dk/nyheder/vejret/reels/russisk-halvoe-paa-vej-tilbage-til-hverdagen-efter-snedommedag",
                  );
                  setNavigateTime("10");
                  setNavigateMuted(false);
                }}
              >
                Load DR example
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavigateUrl("");
                  setNavigateTime("");
                  setNavigateMuted(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </section>
        <div className="status-card">
          <div className="status-label">Status</div>
          <div id="status-text" className="status-value">
            {status}
          </div>
          <div className="status-meta">Last updated: {statusUpdatedAt}</div>
        </div>
        <section className="panel">
          <h2>Send events</h2>
          <div className="grid">
            <div className="field">
              <label htmlFor="custom-message">
                Custom message (string or JSON)
              </label>
              <textarea
                id="custom-message"
                rows={6}
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={customIsJson}
                  onChange={(event) => setCustomIsJson(event.target.checked)}
                />
                Parse as JSON before sending
              </label>
            </div>
            <div className="actions">
              <button type="button" onClick={sendCustomToNative}>
                Send event
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }


export default App;
