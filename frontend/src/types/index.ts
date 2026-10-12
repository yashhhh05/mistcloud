export interface User {
  _id: string;
  $id?: string;
  accountId?: string;
  email: string;
  fullName: string;
  avatar?: string;
  createdAt?: string;
}

export interface FileDoc {
  _id: string;
  $id?: string;
  name: string;
  url: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'other';
  extension: string;
  size: number;
  owner: {
    _id: string;
    $id?: string;
    fullName: string;
    email: string;
    avatar?: string;
  } | string;
  users: string[];
  s3Key?: string;
  bucketFileId?: string;
  createdAt: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface SpaceCategory {
  size: number;
  latestDate: string;
}

export interface TotalSpace {
  document: SpaceCategory;
  image: SpaceCategory;
  video: SpaceCategory;
  audio: SpaceCategory;
  other: SpaceCategory;
  used: number;
  all: number;
}

export interface NavItem {
  name: string;
  icon: string;
  url: string;
}

export interface SortType {
  label: string;
  value: string;
}

export type ActionType = 'rename' | 'details' | 'share' | 'download' | 'delete';
