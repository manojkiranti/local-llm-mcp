import { filterCountryCirculars, filterFolderEntries, filterLists } from './filter.js';
import type {
  IzoneCountryCircular,
  IzoneCountryCircularFilters,
  IzoneFolderEntry,
  IzoneFolderFilters,
  IzoneListFilters,
  IzoneListItem,
  IzoneListSummary,
} from './types.js';

// Mock rows shaped like the real iZone `_api/web/lists` feed.
export const SAMPLE_LISTS: readonly IzoneListSummary[] = [
  { Id: 'sample-list-001', Title: 'Department', BaseTemplate: 100, ItemCount: 12 },
  { Id: 'sample-list-002', Title: 'Announcements', BaseTemplate: 104, ItemCount: 5 },
  { Id: 'sample-list-003', Title: 'Shared Documents', BaseTemplate: 101, ItemCount: 42 },
  { Id: 'sample-list-004', Title: 'Policies', BaseTemplate: 101, ItemCount: 18 },
];

export function listSampleLists(filters: IzoneListFilters): IzoneListSummary[] {
  return filterLists(SAMPLE_LISTS, filters);
}

// Mock rows for a generic list's items, since real column names vary per list.
export const SAMPLE_LIST_ITEMS: readonly IzoneListItem[] = [
  { Id: 1, Title: 'Corporate Banking' },
  { Id: 2, Title: 'Central Operations' },
  { Id: 3, Title: 'Human Resources' },
];

export function sampleListItems(top: number): { results: IzoneListItem[]; hasMore: boolean } {
  const page = SAMPLE_LIST_ITEMS.slice(0, top);
  return { results: page, hasMore: SAMPLE_LIST_ITEMS.length > top };
}

// Mock rows shaped like a real folder's $expand=Files,Folders response.
export const SAMPLE_FOLDER_ENTRIES: readonly IzoneFolderEntry[] = [
  {
    entryType: 'folder',
    Name: 'Policies',
    ServerRelativeUrl: '/Shared Documents/Policies',
    ItemCount: 18,
  },
  {
    entryType: 'file',
    Name: 'Employee Handbook.pdf',
    ServerRelativeUrl: '/Shared Documents/Employee Handbook.pdf',
    Length: '245760',
    TimeLastModified: '2026-01-15T09:30:00Z',
  },
  {
    entryType: 'file',
    Name: 'Leave Policy.docx',
    ServerRelativeUrl: '/Shared Documents/Leave Policy.docx',
    Length: '58210',
    TimeLastModified: '2025-11-02T14:05:00Z',
  },
];

export function listSampleFolderEntries(filters: IzoneFolderFilters): IzoneFolderEntry[] {
  return filterFolderEntries(SAMPLE_FOLDER_ENTRIES, filters);
}

// Mock rows shaped like the real Country Circular index.
export const SAMPLE_COUNTRY_CIRCULARS: readonly IzoneCountryCircular[] = [
  {
    Id: 1,
    Title: 'Revised Leave Policy for Fiscal Year',
    Originator: 'Human Resources',
    SNo: 101,
    CircularDescription: null,
    CircularStatus: 'Current Effective',
    CircularCategory: 'Policies',
    Name: 'CC 101 2025-2026.pdf',
    Type: null,
    IssuanceDate: '2025-07-15T00:00:00',
  },
  {
    Id: 2,
    Title: 'Daily Bulletin on ATM Transactions',
    Originator: 'Think Tank',
    SNo: 102,
    CircularDescription: null,
    CircularStatus: 'Obsolete',
    CircularCategory: 'Performance Update/Bulletin',
    Name: 'CC 102 2024-2025.pdf',
    Type: null,
    IssuanceDate: '2024-11-02T00:00:00',
  },
];

export function listSampleCountryCirculars(filters: IzoneCountryCircularFilters): IzoneCountryCircular[] {
  return filterCountryCirculars(SAMPLE_COUNTRY_CIRCULARS, filters);
}
