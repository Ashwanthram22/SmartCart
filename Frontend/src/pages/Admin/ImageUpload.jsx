import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link as LinkIcon, Loader2, X } from "lucide-react";
import {
  adminGetUploadConfig,
  adminGetUploadSignature,
} from "../../api/client";
import "./ImageUpload.css";

async function loadUploadConfig() {
  try {
    return await adminGetUploadConfig();
  } catch {
    return { configured: false, cloudName: null };
  }
}

async function uploadToCloudinary(file) {
  const sig = await adminGetUploadSignature();
  if (!sig?.signature || !sig?.uploadUrl || !sig?.apiKey) {
    throw new Error("Upload is not configured. Add Cloudinary keys to Backend/.env.");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  if (sig.folder) fd.append("folder", sig.folder);

  const response = await fetch(sig.uploadUrl, { method: "POST", body: fd });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Cloudinary rejected the upload.");
  }
  const json = await response.json();
  if (!json?.secure_url) throw new Error("Cloudinary did not return a URL.");
  return json.secure_url;
}

/**
 * Image picker for product editing.
 *
 * - Uploads to Cloudinary using a server-signed timestamp + signature
 *   (no API secret in the browser).
 * - Falls back to a "paste a URL" mode automatically if the server
 *   reports Cloudinary isn't configured (so the admin can still add
 *   products with hosted image URLs while keys are pending).
 * - Multiple URLs are kept in `value` (an array). The first is also the
 *   primary product `image`.
 */
export default function ImageUpload({ value, onChange, label = "Product images" }) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const [config, setConfig] = useState({ loaded: false, configured: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadUploadConfig();
        if (cancelled) return;
        setConfig({ loaded: true, configured: Boolean(data?.configured) });
      } catch {
        if (cancelled) return;
        setConfig({ loaded: true, configured: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setList = (next) => onChange(next);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`"${file.name}" is not an image.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" is larger than 5 MB.`);
        }
        const url = await uploadToCloudinary(file);
        uploaded.push(url);
      }
      setList([...list, ...uploaded]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addManualUrl = () => {
    const next = urlInput.trim();
    if (!next) return;
    if (!/^https?:\/\//i.test(next)) {
      setError("URL must start with http:// or https://");
      return;
    }
    setList([...list, next]);
    setUrlInput("");
    setError("");
  };

  const removeAt = (idx) => {
    const next = list.slice();
    next.splice(idx, 1);
    setList(next);
  };

  const moveToFront = (idx) => {
    if (idx === 0) return;
    const next = list.slice();
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    setList(next);
  };

  const cloudinaryReady = config.configured;
  const openFilePicker = () => fileRef.current?.click();

  return (
    <div className="iu-root">
      <div className="iu-head">
        <span className="iu-label">{label}</span>
        {!cloudinaryReady && config.loaded ? (
          <span
            className="iu-warn"
            title="Cloudinary keys are not configured on the server."
          >
            URL-only mode
          </span>
        ) : null}
      </div>

      {list.length > 0 ? (
        <ul className="iu-list">
          {list.map((src, idx) => (
            <li
              key={`${src}-${idx}`}
              className={"iu-item" + (idx === 0 ? " iu-item--primary" : "")}
            >
              <img src={src} alt="" loading="lazy" />
              {idx === 0 ? <span className="iu-tag">Primary</span> : null}
              <button
                type="button"
                className="iu-mini iu-mini--danger iu-mini--floating"
                onClick={() => removeAt(idx)}
                aria-label={`Remove image ${idx + 1}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
              <div className="iu-item-actions">
                {idx !== 0 ? (
                  <button
                    type="button"
                    className="iu-mini"
                    onClick={() => moveToFront(idx)}
                    title="Set as primary"
                  >
                    Make primary
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="iu-panel">
        {cloudinaryReady ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              className="iu-dropzone"
              onClick={openFilePicker}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <Loader2 size={22} className="iu-spin" aria-hidden="true" />
              ) : (
                <ImagePlus size={22} aria-hidden="true" />
              )}
              <span className="iu-dropzone-title">
                {busy ? "Uploading…" : "Upload from device"}
              </span>
              <span className="iu-dropzone-hint">JPG, PNG, WebP · up to 5 MB each</span>
            </button>

            <div className="iu-divider" aria-hidden="true">
              <span>or paste a URL</span>
            </div>
          </>
        ) : null}

        <div className="iu-url-row">
          <div className="iu-url">
            <LinkIcon size={16} aria-hidden="true" className="iu-url-icon" />
            <input
              type="url"
              placeholder="https://example.com/product.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualUrl();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="iu-btn iu-btn--add"
            onClick={addManualUrl}
            disabled={!urlInput.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {error ? (
        <p className="iu-error" role="alert">
          {error}
        </p>
      ) : null}
      {!cloudinaryReady && config.loaded ? (
        <p className="iu-help">
          Set <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>{" "}
          and <code>CLOUDINARY_API_SECRET</code> in <code>Backend/.env</code> to
          enable file uploads. Until then you can paste image URLs.
        </p>
      ) : null}
    </div>
  );
}
