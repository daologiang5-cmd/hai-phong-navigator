/**
 * Ward Database - structured knowledge base for the Intelligent Assistant.
 *
 * Re-exports the fully parsed `wards` array (built from wards_part_01..08.md
 * + wards.csv) so the chatbot has a single canonical data source containing,
 * for every one of the 114 units:
 *   - name
 *   - mergedFrom[]
 *   - area, population
 *   - landmarks[] (text + images)
 *   - specialties[] (text + images)
 *   - description (full prose)
 */
export { wards as wardDatabase, wards } from './wardsData';
export type { Ward, WardItem } from '@/types/ward';