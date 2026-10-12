import React from 'react';
import { cn, getFileIcon } from '../utils';

interface ThumbnailProps {
  type: string;
  extension: string;
  url?: string;
  imageClassName?: string;
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({
  type,
  extension,
  url = '',
  imageClassName,
  className,
}) => {
  const isImage = type === 'image' && extension !== 'svg';

  return (
    <figure className={cn('thumbnail', className)}>
      <img
        src={isImage && url ? url : getFileIcon(extension, type)}
        alt="thumbnail"
        className={cn(
          'size-8 object-contain',
          imageClassName,
          isImage && 'thumbnail-image'
        )}
      />
    </figure>
  );
};

export default Thumbnail;
