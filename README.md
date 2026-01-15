# React Native WebView Test Page

This project is a tiny React + Vite web page that acts as a playground for
React Native WebView communication. It listens for messages coming from the
native side, sends messages back via `postMessage`, and exposes a couple of
helpers so injected JavaScript can update the UI or append logs.

## What it does

- Displays a live message log of `message` events from `window` and `document`.
- Sends structured payloads to the native layer using
  `window.ReactNativeWebView.postMessage` (with a `window.postMessage` fallback).
- Reads and renders the injected JavaScript object
  (`injectedObjectJson` / `injectedJavaScriptObject`).
- Exposes `window.__setStatus` and `window.__appendLog` for injected scripts.

## Run locally

```bash
npm install
npm run dev
```

The `dev` script uses `vite --host` so Vite binds to `0.0.0.0`. This is
important for emulators/simulators and real devices because they cannot reach
`localhost` on your machine. Use your machine's LAN IP (or the emulator host
alias) when pointing the WebView to this page.

Examples:

```
http://192.168.1.25:3000
http://10.0.2.2:3000
```

## WebView usage notes

- Load the dev server URL in a React Native `WebView`. For Android emulators,
  use `http://10.0.2.2:3000` to reach your host machine.
- Use the "Send to native" or "Send custom message" buttons to trigger messages
  on the native side.
- Messages received from native will show up in the message log.
- The "Injected JS object" panel shows data from `injectedJavaScriptObject` or
  `injectedObjectJson` when provided by the WebView.

## Injected script helper

`inject.js` is a small snippet you can pass as `injectedJavaScript` in the
WebView. It:

- posts an initial `inject:init` message
- updates the status and log using `window.__setStatus` / `window.__appendLog`
- modifies a few DOM targets for visual confirmation
- posts a delayed `inject:ping`

Use it as a starting point for testing injected scripts.
