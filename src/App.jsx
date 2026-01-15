import { useEffect, useMemo, useState } from "react";
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
  const [count, setCount] = useState(0);
  const [messageInput, setMessageInput] = useState("Hello from WebView");
  const [customMessage, setCustomMessage] = useState(
    JSON.stringify({ type: "custom", payload: { hello: "native" } }, null, 2),
  );
  const [customIsJson, setCustomIsJson] = useState(true);
  const [logs, setLogs] = useState([]);
  const readInjectedObject = () => {
    let candidate = null;

    if (typeof window.ReactNativeWebView?.injectedObjectJson === "function") {
      try {
        console.log("Reading injectedObjectJson()");
        const raw = window.ReactNativeWebView.injectedObjectJson();
        candidate = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (error) {
        candidate = `Error reading injectedObjectJson(): ${error.message}`;
      }
    } else {
      candidate =
        window.injectedJavaScriptObject ??
        window.ReactNativeWebView?.injectedJavaScriptObject ??
        window.__injectedJavaScriptObject ??
        null;
    }

    if (candidate == null) {
      alert("No injected object found");
      candidate = "No injected object found";
    }
    return candidate;
  };

  const [injectedObject, setInjectedObject] = useState(() =>
    readInjectedObject(),
  );
  const [injectedSnapshot, setInjectedSnapshot] = useState(() =>
    formatPretty(readInjectedObject()),
  );

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

  const refreshInjectedObject = () => {
    const candidate = readInjectedObject();
    setInjectedObject(candidate);
    setInjectedSnapshot(formatPretty(candidate));
  };

  const sendToNative = () => {
    const payload = {
      type: "webview-test",
      message: messageInput,
      count,
      sentAt: getTimestamp(),
    };
    const serialized = JSON.stringify(payload);

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(serialized);
    } else {
      window.postMessage(serialized, "*");
    }

    appendLog("postMessage", serialized);
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

  useEffect(() => {
    const handler = (event) => {
      appendLog("message", event.data);
    };

    window.addEventListener("message", handler);
    document.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
      document.removeEventListener("message", handler);
    };
  }, []);

  useEffect(() => {
    window.__setStatus = updateStatus;
    window.__appendLog = (payload) => appendLog("injected", payload);

    return () => {
      delete window.__setStatus;
      delete window.__appendLog;
    };
  }, []);

  const lastLog = useMemo(() => logs[logs.length - 1], [logs]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">React Native WebView test page</p>
          <h1>Local WebView Playground</h1>
          <p className="subhead">
            Run at <span className="mono">http://localhost:3000</span>. Inject
            JS to poke the DOM, update state, or log messages.
          </p>
        </div>
        <div className="status-card">
          <div className="status-label">Status</div>
          <div id="status-text" className="status-value">
            {status}
          </div>

          <div className="status-meta">Last updated: {statusUpdatedAt}</div>
        </div>
      </header>

      <section className="panel">
        <h2>Message log</h2>
        <div id="last-message" className="log-meta">
          {lastLog
            ? `Last event: ${lastLog.time} (${lastLog.source})`
            : "No messages yet."}
        </div>
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
      </section>
      <section className="panel">
        <h2>Injected JS object</h2>
        <div className="log-meta">
          <div>Source: injectedJavaScriptObject</div>
          <div>Type: {typeof injectedObject}</div>
        </div>
        <div className="actions">
          <button type="button" onClick={refreshInjectedObject}>
            Refresh injected object
          </button>
        </div>
        <pre className="log-output">{injectedSnapshot}</pre>
      </section>
      <section className="panel">
        <h2>Controls</h2>
        <div className="grid">
          <div className="field">
            <label htmlFor="message-input">Message payload</label>
            <input
              id="message-input"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
            />
          </div>
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
          <div className="field">
            <label>Counter</label>
            <div className="counter">
              <button
                type="button"
                onClick={() => setCount((value) => value - 1)}
              >
                -
              </button>
              <span id="count-value" className="counter-value">
                {count}
              </span>
              <button
                type="button"
                onClick={() => setCount((value) => value + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="actions">
            <button type="button" onClick={sendToNative}>
              Send to native
            </button>
            <button type="button" onClick={sendCustomToNative}>
              Send custom message
            </button>
            <button
              type="button"
              onClick={() => updateStatus("Updated from UI")}
            >
              Set status
            </button>
            <button type="button" onClick={() => setLogs([])}>
              Clear log
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
