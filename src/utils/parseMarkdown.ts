import { Ward, WardItem } from '@/types/ward';

/**
 * Normalize ward name for comparison (preserves diacritics).
 */
export function normalizeWardName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Clean a single line by stripping ALL markdown formatting noise.
 * Handles all observed variants:
 *   - ### \# WARD_NAME
 *   - **# WARD_NAME**
 *   - ## \# WARD_NAME
 *   - \# WARD_NAME
 *   - \*\*image:\*\*URL
 *   - **image:URL**
 *   - ### image:URL
 * After cleaning, pure content remains.
 */
function cleanLine(line: string): string {
  let s = line.trim();
  if (!s) return '';

  // 1. Convert escaped asterisks \* → *
  s = s.replace(/\\\*/g, '*');

  // 2. Unescape common markdown escapes: \# \- \& \_ \= \?
  s = s.replace(/\\([#\-&_=?])/g, '$1');

  // 3. Remove bold markers **
  s = s.replace(/\*\*/g, '');

  // 4. Remove ALL leading # markers (they are formatting noise in these files)
  s = s.replace(/^(?:#{1,6}\s*)+/, '');

  // 5. Normalize whitespace (tabs → spaces, collapse runs)
  s = s.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Detect if cleaned text is an all-uppercase ward name header.
 */
function isWardHeader(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Must not be a known section keyword
  const lower = text.toLowerCase();
  const sectionWords = ['merged from', 'area', 'population', 'landmarks', 'specialties', 'description'];
  if (sectionWords.includes(lower)) return false;

  // Must not be a data field
  if (/^-\s*name:/i.test(text)) return false;
  if (/^description:/i.test(text)) return false;
  if (/^image:/i.test(text)) return false;

  // Extract only alphabetic characters (including Vietnamese diacritics)
  const letters = text.replace(/[^a-zA-ZÀ-ỹ\u0100-\u024F\u1E00-\u1EFF]/g, '');
  if (letters.length < 3) return false;

  // All letters must be uppercase
  return letters === letters.toUpperCase();
}

/**
 * Detect a section header from cleaned text.
 * Returns section key or null.
 */
function detectSection(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (lower === 'merged from') return 'merged';
  if (lower === 'area') return 'area';
  if (lower === 'population') return 'population';
  if (lower === 'landmarks') return 'landmarks';
  if (lower === 'specialties') return 'specialties';
  if (lower === 'description') return 'description';
  return null;
}

/**
 * Extract image URL from a cleaned line starting with "image:".
 */
function extractImageUrl(text: string): string | null {
  const m = text.match(/^image:\s*(https?:\/\/\S+)/i);
  return m ? m[1] : null;
}

/**
 * Extract item name from "- name: ..." cleaned line.
 */
function extractName(text: string): string | null {
  const m = text.match(/^-\s*name:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

/**
 * Extract description from "description: ..." cleaned line.
 */
function extractDescription(text: string): string | null {
  const m = text.match(/^\s*description:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

/**
 * Parse all wards from a single markdown file.
 * Each ward is isolated: data never leaks between wards.
 */
export function parseMarkdownWards(content: string): Ward[] {
  const rawLines = content.split('\n');

  // Clean every line first
  const lines = rawLines.map(cleanLine);

  // Find ward boundaries (all-uppercase headers)
  const boundaries: { index: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isWardHeader(lines[i])) {
      boundaries.push({ index: i, name: lines[i] });
    }
  }

  // Parse each ward block independently
  const wards: Ward[] = [];
  for (let w = 0; w < boundaries.length; w++) {
    const start = boundaries[w].index;
    const end = w + 1 < boundaries.length ? boundaries[w + 1].index : lines.length;
    const blockLines = lines.slice(start + 1, end);
    const ward = parseWardBlock(boundaries[w].name, blockLines);
    wards.push(ward);
  }

  return wards;
}

/**
 * Parse a single ward's block of cleaned lines.
 */
function parseWardBlock(wardName: string, lines: string[]): Ward {
  const ward: Ward = {
    name: normalizeWardName(wardName),
    area: '',
    population: '',
    mergedFrom: [],
    landmarks: [],
    specialties: [],
    description: ''
  };

  let currentSection = '';
  let itemName = '';
  let itemDesc = '';
  let itemImages: string[] = [];
  let descParts: string[] = [];

  const flushItem = () => {
    if (!itemName) return;
    const text = itemDesc ? `${itemName} -- ${itemDesc}` : itemName;

    if (currentSection === 'merged') {
      ward.mergedFrom.push(itemName);
    } else if (currentSection === 'landmarks') {
      ward.landmarks.push({ text, images: [...itemImages] });
    } else if (currentSection === 'specialties') {
      ward.specialties.push({ text, images: [...itemImages] });
    }

    itemName = '';
    itemDesc = '';
    itemImages = [];
  };

  for (const line of lines) {
    if (!line) continue;

    // 1. Check for image URL
    const imgUrl = extractImageUrl(line);
    if (imgUrl) {
      if (itemName) {
        // Belongs to the item currently being built
        itemImages.push(imgUrl);
      } else {
        // Attach to last item in current section
        const list = currentSection === 'landmarks' ? ward.landmarks
          : currentSection === 'specialties' ? ward.specialties : null;
        if (list && list.length > 0) {
          list[list.length - 1].images.push(imgUrl);
        }
      }
      continue;
    }

    // 2. Check for section header
    const section = detectSection(line);
    if (section) {
      flushItem();
      if (currentSection === 'description' && descParts.length > 0) {
        ward.description = descParts.join(' ').trim();
        descParts = [];
      }
      currentSection = section;
      continue;
    }

    // 3. Check for "- name:" line (new item)
    const name = extractName(line);
    if (name && (currentSection === 'merged' || currentSection === 'landmarks' || currentSection === 'specialties')) {
      flushItem();
      itemName = name;
      continue;
    }

    // 4. Check for "description:" line (belongs to current item)
    const desc = extractDescription(line);
    if (desc && itemName) {
      itemDesc = desc;
      continue;
    }

    if (!currentSection) continue;

    // 5. Handle Area (plain numeric text)
    if (currentSection === 'area' && !ward.area) {
      const areaMatch = line.match(/([\d.,]+)\s*km[²2]?/i);
      if (areaMatch) {
        ward.area = `${areaMatch[1]} km²`;
      } else {
        const numMatch = line.match(/([\d.,]+)/);
        if (numMatch) ward.area = `${numMatch[1]} km²`;
      }
      continue;
    }

    // 6. Handle Population (plain numeric text)
    if (currentSection === 'population' && !ward.population) {
      const popMatch = line.match(/([\d.,]+)/);
      if (popMatch) ward.population = popMatch[1].replace(/,/g, '');
      continue;
    }

    // 7. Handle Description section (free text)
    if (currentSection === 'description') {
      if (line) descParts.push(line);
      continue;
    }
  }

  // Flush final pending item
  flushItem();
  if (currentSection === 'description' && descParts.length > 0) {
    ward.description = descParts.join(' ').trim();
  }

  return ward;
}

/**
 * Parse CSV data for ward information (Area and Population enrichment only).
 */
export function parseCSV(content: string): Map<string, { population: string; area: string }> {
  const lines = content.trim().split('\n');
  const map = new Map<string, { population: string; area: string }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    if (values.length >= 4) {
      const name = normalizeWardName(values[0].replace(/^\uFEFF/, ''));
      const population = values[2]?.trim() || '';
      const area = values[3]?.trim() || '';

      if (name) {
        map.set(name, {
          population,
          area: area ? `${area} km²` : ''
        });
      }
    }
  }

  return map;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Build old name to new name index.
 */
export function buildOldNameIndex(wards: Ward[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const ward of wards) {
    index.set(ward.name.toLowerCase(), ward.name);

    for (const oldName of ward.mergedFrom) {
      const cleanName = oldName.replace(/\s*\([^)]*\)/g, '').trim();
      if (cleanName) {
        index.set(cleanName.toLowerCase(), ward.name);
      }
    }
  }

  return index;
}
