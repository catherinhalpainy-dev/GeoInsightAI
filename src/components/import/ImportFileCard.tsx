interface ImportFileCardProps {
  file: File;
}

export function ImportFileCard({
  file,
}: ImportFileCardProps) {
  const fileSizeKb =
    file.size / 1024;

  return (
    <article className="import-file-card">
      <div className="import-file-icon">
        GEO
      </div>

      <div className="import-file-info">
        <strong>{file.name}</strong>

        <span>
          {fileSizeKb < 1024
            ? `${fileSizeKb.toFixed(
                1,
              )} KB`
            : `${(
                fileSizeKb / 1024
              ).toFixed(2)} MB`}
        </span>
      </div>

      <span className="import-file-status">
        已选择
      </span>
    </article>
  );
}