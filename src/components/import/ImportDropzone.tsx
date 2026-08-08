import {
  useRef,
  useState,
} from "react";

interface ImportDropzoneProps {
  disabled?: boolean;

  onFileSelect: (
    file: File,
  ) => void;
}

export function ImportDropzone({
  disabled = false,
  onFileSelect,
}: ImportDropzoneProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  function handleFile(
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    onFileSelect(file);
  }

  return (
    <section
      className={
        dragActive
          ? "import-dropzone drag-active"
          : "import-dropzone"
      }
      onDragEnter={(event) => {
        event.preventDefault();

        if (!disabled) {
          setDragActive(true);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();

        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();

        setDragActive(false);

        if (disabled) {
          return;
        }

        handleFile(
          event.dataTransfer.files[0],
        );
      }}
    >
      <div className="import-dropzone-icon">
        ↑
      </div>

      <h2>拖拽空间数据到这里</h2>

      <p>
        当前支持 GeoJSON / JSON，
        数据坐标系要求 EPSG:4326
      </p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          inputRef.current?.click();
        }}
      >
        选择文件
      </button>

      <input
        ref={inputRef}
        className="import-file-input"
        type="file"
        accept=".geojson,.json,application/json"
        disabled={disabled}
        onChange={(event) => {
          handleFile(
            event.currentTarget
              .files?.[0],
          );

          event.currentTarget.value =
            "";
        }}
      />
    </section>
  );
}