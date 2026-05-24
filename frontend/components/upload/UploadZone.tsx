"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUpload: (file: File) => void;
  loading?: boolean;
}

export function UploadZone({ onUpload, loading }: Props) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/zip": [".zip"], "application/gzip": [".tar.gz", ".tgz"] },
    maxFiles: 1, disabled: loading
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div
        {...getRootProps()}
        style={{
          padding: "var(--space-8)", borderRadius: "var(--radius-lg)",
          border: `2px dashed ${isDragActive ? "var(--color-primary)" : "var(--color-border)"}`,
          background: isDragActive ? "var(--color-primary-highlight)" : "var(--color-surface-2)",
          textAlign: "center", cursor: loading ? "not-allowed" : "pointer",
          transition: "all var(--transition-interactive)"
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>📦</div>
        {file ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-success)", fontWeight: 600 }}>
            ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        ) : (
          <>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
              {isDragActive ? "Drop your zip here!" : "Drag & drop a .zip or .tar.gz"}
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              or click to browse — max 500MB
            </p>
          </>
        )}
      </div>
      {file && (
        <button
          onClick={() => onUpload(file)}
          disabled={loading}
          style={{
            padding: "var(--space-3)", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "#000", fontWeight: 700,
            fontSize: "var(--text-sm)", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Uploading..." : "Upload & Analyze"}
        </button>
      )}
    </div>
  );
}
