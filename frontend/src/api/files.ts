import apiClient from './axios';
import type { FileDoc, TotalSpace } from '../types';

export interface GetFilesParams {
  types?: string[];
  searchText?: string;
  sort?: string;
  limit?: number;
}

export interface GetFilesResponse {
  total: number;
  documents: FileDoc[];
}

// 1. Fetch files with filters
export const getFiles = async (params: GetFilesParams = {}): Promise<GetFilesResponse> => {
  const queryParams: Record<string, string | number> = {};

  if (params.types && params.types.length > 0) {
    queryParams.types = params.types.join(',');
  }
  if (params.searchText) {
    queryParams.searchText = params.searchText;
  }
  if (params.sort) {
    queryParams.sort = params.sort;
  }
  if (params.limit) {
    queryParams.limit = params.limit;
  }

  const response = await apiClient.get<GetFilesResponse>('/files', {
    params: queryParams,
  });
  return response.data;
};

// 2. Fetch Storage Usage breakdown
export const getTotalSpaceUsed = async (): Promise<TotalSpace> => {
  const response = await apiClient.get<TotalSpace>('/files/usage');
  return response.data;
};

// 3. Upload file with multipart/form-data and progress tracking
export const uploadFile = async (
  file: File,
  onProgress?: (percentage: number) => void
): Promise<FileDoc> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<FileDoc>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

// 4. Rename file
export const renameFile = async (
  fileId: string,
  name: string,
  extension: string
): Promise<FileDoc> => {
  const response = await apiClient.patch<FileDoc>(`/files/${fileId}/rename`, {
    name,
    extension,
  });
  return response.data;
};

// 5. Update shared users
export const updateFileUsers = async (
  fileId: string,
  emails: string[]
): Promise<FileDoc> => {
  const response = await apiClient.patch<FileDoc>(`/files/${fileId}/share`, {
    emails,
  });
  return response.data;
};

// 6. Delete file
export const deleteFile = async (fileId: string): Promise<{ status: string }> => {
  const response = await apiClient.delete<{ status: string }>(`/files/${fileId}`);
  return response.data;
};

// 7. Search files by text query
export const searchFiles = async (query: string): Promise<FileDoc[]> => {
  if (!query || query.trim() === '') return [];
  const response = await apiClient.get<FileDoc[]>('/search', {
    params: { query },
  });
  return response.data;
};

// 8. Helper to construct download URL
export const getDownloadUrl = (file: FileDoc): string => {
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  return `${baseURL}/files/${file._id || file.$id}/download`;
};
