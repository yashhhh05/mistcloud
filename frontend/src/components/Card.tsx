import React, { useState } from 'react';
import type { FileDoc } from '../types';
import Thumbnail from './Thumbnail';
import { convertFileSize, formatDateTime } from '../utils';
import ActionDropdown from './ActionDropdown';
import { useAuth } from '../context/AuthContext';

interface CardProps {
  file: FileDoc;
  onRefresh?: () => void;
}

export const Card: React.FC<CardProps> = ({ file, onRefresh }) => {
  const { user } = useAuth();

  const ownerName =
    typeof file.owner === 'object' && file.owner?.fullName
      ? file.owner.fullName
      : 'User';

  const ownerId =
    typeof file.owner === 'object' && (file.owner?._id || file.owner?.$id)
      ? (file.owner._id || file.owner.$id)
      : file.owner;

  const currentUserId = user?._id || user?.$id;

  const isOwner = Boolean(
    currentUserId &&
      (ownerId === currentUserId ||
        (user?.fullName && ownerName === user.fullName))
  );

  return (
    <div className="file-card group relative">
      <div className="flex justify-between items-start">
        <Thumbnail
          type={file.type}
          extension={file.extension}
          url={file.url}
          className="size-16 sm:size-20 min-w-16"
          imageClassName="size-9 sm:size-11"
        />

        <div className="flex flex-col items-end justify-between gap-1">
          <ActionDropdown file={file} onRefresh={onRefresh} />
          <p className="body-1 font-medium text-light-100">
            {convertFileSize(file.size)}
          </p>
        </div>
      </div>

      <div className="file-card-details mt-4">
        <p className="subtitle-2 line-clamp-1 text-light-100 font-semibold" title={file.name}>
          {file.name}
        </p>

        <p className="body-2 text-light-200 mt-1">
          {formatDateTime(file.createdAt || file.$createdAt)}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-light-300">
          <p className="caption line-clamp-1 text-light-200">
            By: <span className="font-medium text-light-100">{ownerName}</span>
          </p>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isOwner
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isOwner ? 'Owner' : 'Shared'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Card;
