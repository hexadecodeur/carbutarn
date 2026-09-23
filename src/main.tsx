import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Analytics } from "@vercel/analytics/react"
import { initSentry, maybeSendSentryTestError } from "./sentry"
import "./index.css"
import App from "./App.tsx"

initSentry()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)

maybeSendSentryTestError()

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[sw] register failed", error)
    })
  })
}
