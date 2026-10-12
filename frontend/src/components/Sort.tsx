import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { sortTypes } from '../constants';

export const Sort: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSort = searchParams.get('sort') || '$createdAt-desc';

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sort', e.target.value);
    setSearchParams(nextParams);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="body-2 text-light-200 hidden sm:inline">Sort by:</span>
      <select
        value={currentSort}
        onChange={handleSortChange}
        className="sort-select bg-light-400 border border-light-300 text-light-100 text-sm rounded-xl px-3 py-2 outline-none focus:border-brand cursor-pointer"
      >
        {sortTypes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Sort;
