import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../api/files';
import { getFileType, convertFileToUrl, cn } from '../utils';
import { MAX_FILE_SIZE } from '../constants';
import Thumbnail from './Thumbnail';
import { toast } from 'sonner';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
}

interface FileUploaderProps {
  className?: string;
  onUploadSuccess?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  className,
  onUploadSuccess,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const handleRemoveUploading = (id: string) => {
    setUploadingFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newItems: UploadingFile[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        if (item.file.size > MAX_FILE_SIZE) {
          toast.warning(`"${item.file.name}" exceeds the 50MB file size limit.`);
          handleRemoveUploading(item.id);
          continue;
        }

        try {
          await uploadFile(item.file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress } : f))
            );
          });

          toast.success(`"${item.file.name}" uploaded successfully!`);
          handleRemoveUploading(item.id);
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } catch (error: any) {
          console.error('File upload failed:', error);
          toast.error(error.message || `Failed to upload "${item.file.name}"`);
          handleRemoveUploading(item.id);
        }
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <button
        type="button"
        className={cn(
          'uploader-button',
          isDragActive && 'opacity-80 scale-105',
          className
        )}
      >
        <img
          src="/assets/icons/upload.svg"
          alt="upload"
          className="h-5 w-5"
        />
        <p className="font-semibold text-white">Upload</p>
      </button>

      {uploadingFiles.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100 mb-2">Uploading Files</h4>

          {uploadingFiles.map((item) => {
            const { type, extension } = getFileType(item.file.name);
            return (
              <li key={item.id} className="uploader-preview-item">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(item.file)}
                    className="size-10 min-w-10"
                  />
                  <div className="overflow-hidden">
                    <p className="subtitle-2 line-clamp-1 text-light-100">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-28 bg-light-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="caption text-light-200">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                <img
                  src="/assets/icons/remove.svg"
                  alt="cancel"
                  className="h-5 w-5 cursor-pointer opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUploading(item.id);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
