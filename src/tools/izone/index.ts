import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../../auth/service-token.js';
import { registerListIzoneDocuments } from './list-documents.js';
import { registerListIzoneListItems } from './list-items.js';
import { registerListIzoneLists } from './list-lists.js';
import { registerSearchIzoneCountryCirculars } from './search-country-circulars.js';

export function registerIzoneTools(server: FastMCP<ServiceSession>): void {
  registerListIzoneLists(server);
  registerListIzoneListItems(server);
  registerListIzoneDocuments(server);
  registerSearchIzoneCountryCirculars(server);
}
