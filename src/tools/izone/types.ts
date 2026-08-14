// Field names mirror the iZone (on-prem SharePoint) REST API's OData
// "verbose" JSON shapes (GET {IZONE_BASE_URL}_api/web/...).

export type IzoneListSummary = {
  Id: string;
  Title: string;
  /** SharePoint list template id, e.g. 100 = generic list, 101 = document library, 107 = tasks. */
  BaseTemplate: number;
  ItemCount: number;
};

export type IzoneListFilters = {
  /** Case-insensitive substring match on Title. */
  search?: string;
  limit: number;
  /** Matching lists to skip before taking `limit`, for paging. Defaults to 0. */
  offset?: number;
};

/** A row from a SharePoint list. Field names are the list's own internal column names. */
export type IzoneListItem = Record<string, unknown>;

export type IzoneFile = {
  Name: string;
  ServerRelativeUrl: string;
  /** SharePoint returns file size as a string (Int64). */
  Length: string;
  TimeLastModified: string;
};

export type IzoneFolder = {
  Name: string;
  ServerRelativeUrl: string;
  ItemCount: number;
};

export type IzoneFolderEntry =
  | ({ entryType: 'folder' } & IzoneFolder)
  | ({ entryType: 'file' } & IzoneFile);

export type IzoneFolderFilters = {
  /** Case-insensitive substring match on Name. */
  search?: string;
  limit: number;
  /** Matching entries to skip before taking `limit`, for paging. Defaults to 0. */
  offset?: number;
};

// Field names mirror the internal API the "Search Country Circular.aspx"
// page's own JavaScript calls (GET {IZONE_COUNTRY_CIRCULAR_URL}) — this is
// not the SharePoint REST API and not OData-shaped; it returns a plain JSON
// array of every circular.
export type IzoneCountryCircular = {
  Id: number;
  Title: string;
  Originator: string;
  SNo: number;
  CircularDescription: string | null;
  CircularStatus: string;
  CircularCategory: string;
  /** The stored file name, e.g. "CC 6414 2020-2021.pdf". */
  Name: string;
  Type: string | null;
  IssuanceDate: string;
};

export type IzoneCountryCircularFilters = {
  /** Case-insensitive substring match across title, originator, category, status, description, and file name. */
  search?: string;
  /** Exact match (case-insensitive) on CircularStatus, e.g. "Current Effective". */
  status?: string;
  /** Case-insensitive substring match on CircularCategory. */
  category?: string;
  /** Case-insensitive substring match on Originator. */
  originator?: string;
  limit: number;
  /** Matching circulars to skip before taking `limit`, for paging. Defaults to 0. */
  offset?: number;
};
