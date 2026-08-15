import type {
  IzoneCountryCircular,
  IzoneCountryCircularFilters,
  IzoneFolderEntry,
  IzoneFolderFilters,
  IzoneListFilters,
  IzoneListSummary,
} from './types.js';

/** Applies the one-extra-record pagination trick to an in-memory list. */
export function paginate<T>(matched: readonly T[], limit: number): { page: T[]; hasMore: boolean } {
  const hasMore = matched.length > limit;
  return { page: hasMore ? matched.slice(0, limit) : [...matched], hasMore };
}

export function filterLists(
  lists: readonly IzoneListSummary[],
  filters: IzoneListFilters,
): IzoneListSummary[] {
  const search = filters.search?.trim().toLowerCase();
  return lists
    .filter((list) => !search || list.Title.toLowerCase().includes(search))
    .slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
}

export function filterFolderEntries(
  entries: readonly IzoneFolderEntry[],
  filters: IzoneFolderFilters,
): IzoneFolderEntry[] {
  const search = filters.search?.trim().toLowerCase();
  return entries
    .filter((entry) => !search || entry.Name.toLowerCase().includes(search))
    .slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
}

const CIRCULAR_SEARCH_FIELDS = [
  'Title',
  'Originator',
  'CircularCategory',
  'CircularStatus',
  'CircularDescription',
  'Name',
] as const satisfies readonly (keyof IzoneCountryCircular)[];

export function filterCountryCirculars(
  circulars: readonly IzoneCountryCircular[],
  filters: IzoneCountryCircularFilters,
): IzoneCountryCircular[] {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status?.trim().toLowerCase();
  const category = filters.category?.trim().toLowerCase();
  const originator = filters.originator?.trim().toLowerCase();
  return circulars
    .filter((c) => !status || c.CircularStatus?.toLowerCase() === status)
    .filter((c) => !category || c.CircularCategory?.toLowerCase().includes(category))
    .filter((c) => !originator || c.Originator?.toLowerCase().includes(originator))
    .filter(
      (c) =>
        !search ||
        CIRCULAR_SEARCH_FIELDS.some((field) => String(c[field] ?? '').toLowerCase().includes(search)),
    )
    .slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
}
