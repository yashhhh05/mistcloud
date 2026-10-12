import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TotalSpace } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

export const convertFileSize = (sizeInBytes: number, digits?: number) => {
  if (!sizeInBytes || sizeInBytes === 0) return '0 Bytes';
  if (sizeInBytes < 1024) {
    return sizeInBytes + ' Bytes';
  } else if (sizeInBytes < 1024 * 1024) {
    const sizeInKB = sizeInBytes / 1024;
    return sizeInKB.toFixed(digits || 1) + ' KB';
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return sizeInMB.toFixed(digits || 1) + ' MB';
  } else {
    const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
    return sizeInGB.toFixed(digits || 2) + ' GB';
  }
};

export const calculatePercentage = (sizeInBytes: number) => {
  const totalSizeInBytes = 2 * 1024 * 1024 * 1024; // 2GB quota
  const percentage = (sizeInBytes / totalSizeInBytes) * 100;
  return Number(percentage.toFixed(1));
};

export const getFileType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (!extension) return { type: 'other' as const, extension: '' };

  const documentExtensions = [
    'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'csv', 'rtf', 'ods', 'ppt', 'pptx',
    'odp', 'md', 'html', 'htm', 'epub', 'pages', 'fig', 'psd', 'ai', 'sketch'
  ];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'aiff', 'alac'];

  if (documentExtensions.includes(extension)) return { type: 'document' as const, extension };
  if (imageExtensions.includes(extension)) return { type: 'image' as const, extension };
  if (videoExtensions.includes(extension)) return { type: 'video' as const, extension };
  if (audioExtensions.includes(extension)) return { type: 'audio' as const, extension };

  return { type: 'other' as const, extension };
};

export const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return '—';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;

  const time = `${hours}:${minutes.toString().padStart(2, '0')}${period}`;
  const day = date.getDate();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthNames[date.getMonth()];

  return `${time}, ${day} ${month}`;
};

export const getFileIcon = (extension: string | undefined, type: string) => {
  switch (extension) {
    case 'pdf':
      return '/assets/icons/file-pdf.svg';
    case 'doc':
      return '/assets/icons/file-doc.svg';
    case 'docx':
      return '/assets/icons/file-docx.svg';
    case 'csv':
      return '/assets/icons/file-csv.svg';
    case 'txt':
      return '/assets/icons/file-txt.svg';
    case 'xls':
    case 'xlsx':
      return '/assets/icons/file-document.svg';
    case 'svg':
    case 'png':
    case 'jpg':
    case 'jpeg':
      return '/assets/icons/file-image.svg';
    case 'mkv':
    case 'mov':
    case 'avi':
    case 'mp4':
    case 'webm':
      return '/assets/icons/file-video.svg';
    case 'mp3':
    case 'wav':
    case 'aac':
    case 'flac':
    case 'ogg':
      return '/assets/icons/file-audio.svg';
    default:
      switch (type) {
        case 'image':
          return '/assets/icons/file-image.svg';
        case 'document':
          return '/assets/icons/file-document.svg';
        case 'video':
          return '/assets/icons/file-video.svg';
        case 'audio':
          return '/assets/icons/file-audio.svg';
        default:
          return '/assets/icons/file-other.svg';
      }
  }
};

export const getUsageSummary = (totalSpace?: TotalSpace | null) => {
  const safeSpace = totalSpace || {
    document: { size: 0, latestDate: '' },
    image: { size: 0, latestDate: '' },
    video: { size: 0, latestDate: '' },
    audio: { size: 0, latestDate: '' },
    other: { size: 0, latestDate: '' },
    used: 0,
    all: 2 * 1024 * 1024 * 1024,
  };

  return [
    {
      title: 'Documents',
      size: safeSpace.document?.size || 0,
      latestDate: safeSpace.document?.latestDate || '',
      icon: '/assets/icons/file-document-light.svg',
      url: '/documents',
    },
    {
      title: 'Images',
      size: safeSpace.image?.size || 0,
      latestDate: safeSpace.image?.latestDate || '',
      icon: '/assets/icons/file-image-light.svg',
      url: '/images',
    },
    {
      title: 'Media',
      size: (safeSpace.video?.size || 0) + (safeSpace.audio?.size || 0),
      latestDate:
        (safeSpace.video?.latestDate || '') > (safeSpace.audio?.latestDate || '')
          ? safeSpace.video?.latestDate || ''
          : safeSpace.audio?.latestDate || '',
      icon: '/assets/icons/file-video-light.svg',
      url: '/media',
    },
    {
      title: 'Others',
      size: safeSpace.other?.size || 0,
      latestDate: safeSpace.other?.latestDate || '',
      icon: '/assets/icons/file-other-light.svg',
      url: '/others',
    },
  ];
};

export const getFileTypesParams = (type: string) => {
  switch (type.toLowerCase()) {
    case 'documents':
      return ['document'];
    case 'images':
      return ['image'];
    case 'media':
      return ['video', 'audio'];
    case 'others':
      return ['other'];
    default:
      return [];
  }
};
