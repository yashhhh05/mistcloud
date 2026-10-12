import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import { getFiles } from '../api/files';
import type { FileDoc } from '../types';
import { convertFileSize, getFileTypesParams } from '../utils';
import Card from '../components/Card';
import Sort from '../components/Sort';

export const FilesView: React.FC = () => {
  const { type = 'documents' } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const searchText = searchParams.get('query') || '';
  const sort = searchParams.get('sort') || '$createdAt-desc';

  const { refreshTrigger, handleRefresh } = useOutletContext<{
    refreshTrigger: number;
    handleRefresh: () => void;
  }>();

  const [files, setFiles] = useState<FileDoc[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = async () => {
    setIsLoading(true);
    const types = getFileTypesParams(type);
    try {
      const res = await getFiles({
        types,
        searchText,
        sort,
      });

      const docs = res.documents || [];
      setFiles(docs);
      const sizeSum = docs.reduce((acc, curr) => acc + (curr.size || 0), 0);
      setTotalSize(sizeSum);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [type, searchText, sort, refreshTrigger]);

  return (
    <div className="page-container max-w-7xl mx-auto space-y-6">
      <section className="w-full">
        <h1 className="h1 capitalize text-dark-100 font-bold mb-3">{type}</h1>

        <div className="total-size-section flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-light-300">
          <p className="body-1 text-light-100 font-normal">
            Total Size: <span className="text-brand font-semibold">{convertFileSize(totalSize)}</span>
          </p>

          <Sort />
        </div>
      </section>

      {/* Render files list */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <img
            src="/assets/icons/loader.svg"
            alt="loading"
            className="size-8 animate-spin text-brand"
          />
        </div>
      ) : files.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {files.map((file) => (
            <Card
              key={file._id || file.$id}
              file={file}
              onRefresh={handleRefresh}
            />
          ))}
        </section>
      ) : (
        <div className="text-center py-20 bg-light-400/50 rounded-2xl border border-dashed border-light-300">
          <img
            src="/assets/images/files.png"
            alt="No files"
            className="size-20 mx-auto opacity-50 mb-3"
          />
          <p className="body-1 text-light-200">
            {searchText
              ? `No files found matching "${searchText}"`
              : 'No files uploaded yet in this category'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FilesView;
