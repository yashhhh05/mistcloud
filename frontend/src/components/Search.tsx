import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchFiles } from '../api/files';
import { FileDoc } from '../types';
import Thumbnail from './Thumbnail';
import { formatDateTime } from '../utils';

export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.get('query') || '';
  const [query, setQuery] = useState(currentQuery);
  const [results, setResults] = useState<FileDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Sync state if URL query changes externally
  useEffect(() => {
    setQuery(searchParams.get('query') || '');
  }, [searchParams]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setOpen(false);
        // Clear query from url if empty
        if (searchParams.has('query')) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('query');
          setSearchParams(nextParams);
        }
        return;
      }

      setIsLoading(true);
      try {
        const files = await searchFiles(query.trim());
        setResults(files);
        setOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectFile = (file: FileDoc) => {
    setOpen(false);
    const category =
      file.type === 'video' || file.type === 'audio'
        ? 'media'
        : file.type === 'other'
        ? 'others'
        : `${file.type}s`;
    navigate(`/${category}?query=${encodeURIComponent(file.name)}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search">
      <div className="search-input-wrapper">
        <img
          src="/assets/icons/search.svg"
          alt="search"
          className="h-6 w-6 opacity-60"
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files..."
          className="search-input"
        />

        {isLoading && (
          <img
            src="/assets/icons/loader.svg"
            alt="loading"
            className="h-5 w-5 animate-spin text-brand"
          />
        )}

        {query && !isLoading && (
          <img
            src="/assets/icons/remove.svg"
            alt="Clear"
            className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100"
            onClick={handleClear}
          />
        )}

        {open && (
          <ul className="search-result">
            {results.length > 0 ? (
              results.map((file) => (
                <li
                  key={file._id || file.$id}
                  className="flex items-center justify-between p-2.5 hover:bg-light-400 rounded-xl cursor-pointer transition-colors"
                  onClick={() => handleSelectFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <Thumbnail
                      type={file.type}
                      extension={file.extension}
                      url={file.url}
                      className="size-9 min-w-9"
                    />
                    <p className="subtitle-2 line-clamp-1 text-light-100">
                      {file.name}
                    </p>
                  </div>

                  <span className="caption text-light-200">
                    {formatDateTime(file.createdAt || file.$createdAt)}
                  </span>
                </li>
              ))
            ) : (
              <p className="empty-result">No files found matching &quot;{query}&quot;</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
