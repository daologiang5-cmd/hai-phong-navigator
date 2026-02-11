import { Ward, WardItem } from '@/types/ward';

/**
 * Normalize ward name for exact comparison (preserves diacritics)
 */
export function normalizeWardName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Strip ALL markdown formatting from a line: **, ##, \#, \-, leading whitespace, etc.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')       // bold
    .replace(/\\([#\-&_=?])/g, '$1') // escaped chars: \# → #, \- → -, etc.
    .replace(/^#{1,6}\s*/, '')  // leading ### 
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect a level-1 ward heading. Returns ward name or null.
 * Handles: # NAME, \# NAME, ### \# NAME, **# NAME**, ## \# NAME
 */
function parseWardHeader(line: string): string | null {
  const t = line.trim();

  // Pattern: **# NAME** (bold-wrapped)
  const boldMatch = t.match(/^\*\*#\s+(.+?)\*\*\s*$/);
  if (boldMatch) return stripMarkdown(boldMatch[1]);

  // Pattern: (optional ###) \# NAME  
  const escapedMatch = t.match(/^(?:#{1,6}\s*)?\\#\s+(.+?)\s*$/);
  if (escapedMatch) return stripMarkdown(escapedMatch[1]);

  // Pattern: bare # NAME (not ## or ###)
  if (/^#\s+[^#]/.test(t) && !t.startsWith('##')) {
    const m = t.match(/^#\s+(.+?)\s*$/);
    if (m) return stripMarkdown(m[1]);
  }

  return null;
}

/**
 * Detect a level-2 section heading. Returns section name (lowercased) or null.
 * Handles: ## Section, \## Section, ### \## Section, **## Section**
 */
function parseSectionHeader(line: string): string | null {
  const t = line.trim();
  const sectionKeywords = ['merged', 'area', 'population', 'landmark', 'special', 'description'];

  // Pattern: **## Section**
  const boldMatch = t.match(/^\*\*##\s+(.+?)\*\*\s*$/);
  if (boldMatch) {
    const s = stripMarkdown(boldMatch[1]).toLowerCase();
    if (sectionKeywords.some(k => s.includes(k))) return s;
  }

  // Pattern: (optional ###) \## Section
  const escapedMatch = t.match(/^(?:#{1,6}\s*)?\\##\s+(.+?)\s*$/);
  if (escapedMatch) {
    const s = stripMarkdown(escapedMatch[1]).toLowerCase();
    if (sectionKeywords.some(k => s.includes(k))) return s;
  }

  // Pattern: bare ## Section (not ###)
  if (/^##\s+[^#]/.test(t) && !t.startsWith('###')) {
    const m = t.match(/^##\s+(.+?)\s*$/);
    if (m) {
      const s = stripMarkdown(m[1]).toLowerCase();
      if (sectionKeywords.some(k => s.includes(k))) return s;
    }
  }

  return null;
}

/**
 * Extract image URL from a line containing image:URL
 */
function extractImageUrl(line: string): string | null {
  const stripped = line.trim()
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/, '')
    .trim();

  const m = stripped.match(/^image:\s*(https?:\/\/\S+)/i);
  if (m) return m[1].replace(/\\([&_=?#])/g, '$1');

  return null;
}

/**
 * Check if a line contains a "- name:" item. Returns the name value or null.
 */
function parseNameLine(line: string): string | null {
  const clean = stripMarkdown(line);
  const m = clean.match(/^-\s*name:\s*(.+)/i);
  if (m) return m[1].trim();
  return null;
}

/**
 * Check if a line contains a "description:" continuation. Returns the description text or null.
 */
function parseDescriptionLine(line: string): string | null {
  const clean = stripMarkdown(line);
  const m = clean.match(/^\s*description:\s*(.+)/i);
  if (m) return m[1].trim();
  return null;
}

/**
 * Parse all wards from markdown content with STRICT BOUNDARY ISOLATION.
 */
export function parseMarkdownWards(content: string): Ward[] {
  const lines = content.split('\n');
  const wards: Ward[] = [];

  // Step 1: Find all ward boundaries
  const boundaries: { line: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const name = parseWardHeader(lines[i]);
    if (name) boundaries.push({ line: i, name });
  }

  // Step 2: Parse each ward block independently
  for (let w = 0; w < boundaries.length; w++) {
    const start = boundaries[w].line;
    const end = w + 1 < boundaries.length ? boundaries[w + 1].line : lines.length;
    const ward = parseWardBlock(boundaries[w].name, lines.slice(start, end));
    wards.push(ward);
  }

  return wards;
}

/**
 * Parse a single ward block. Each item has: name, description, image (on separate lines).
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
  // For building current item (name + description + images)
  let itemName = '';
  let itemDesc = '';
  let itemImages: string[] = [];
  let descriptionParts: string[] = [];

  const flushItem = () => {
    if (!itemName) return;
    const fullText = itemDesc ? `${itemName} -- ${itemDesc}` : itemName;

    if (currentSection.includes('merged') || currentSection.includes('from')) {
      ward.mergedFrom.push(itemName);
    } else if (currentSection.includes('landmark')) {
      ward.landmarks.push({ text: fullText, images: [...itemImages] });
    } else if (currentSection.includes('special')) {
      ward.specialties.push({ text: fullText, images: [...itemImages] });
    }

    itemName = '';
    itemDesc = '';
    itemImages = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed === '&nbsp;') continue;

    // 1. Check for image URL
    const imageUrl = extractImageUrl(line);
    if (imageUrl) {
      if (itemName) {
        // Belongs to current item being built
        itemImages.push(imageUrl);
      } else {
        // Attach to last item in current section
        const list = currentSection.includes('landmark') ? ward.landmarks
          : currentSection.includes('special') ? ward.specialties : null;
        if (list && list.length > 0) {
          list[list.length - 1].images.push(imageUrl);
        }
      }
      continue;
    }

    // 2. Check for section header
    const section = parseSectionHeader(line);
    if (section) {
      flushItem();
      if (currentSection.includes('description') && descriptionParts.length > 0) {
        ward.description = descriptionParts.join(' ').trim();
        descriptionParts = [];
      }
      currentSection = section;
      continue;
    }

    // 3. Check for "- name:" line (new item)
    const name = parseNameLine(line);
    if (name && (currentSection.includes('landmark') || currentSection.includes('special') || currentSection.includes('merged') || currentSection.includes('from'))) {
      flushItem();
      itemName = name;
      continue;
    }

    // 4. Check for "description:" line (belongs to current item)
    const desc = parseDescriptionLine(line);
    if (desc && itemName) {
      itemDesc = desc;
      continue;
    }

    if (!currentSection) continue;

    // 5. Handle area/population (plain text value)
    const cleanedLine = stripMarkdown(trimmed);

    if (currentSection.includes('area') && !ward.area) {
      const areaMatch = cleanedLine.match(/([\d.,]+)\s*km[²2]?/i);
      if (areaMatch) {
        ward.area = `${areaMatch[1]} km²`;
      } else {
        const numMatch = cleanedLine.match(/([\d.,]+)/);
        if (numMatch) ward.area = `${numMatch[1]} km²`;
      }
      continue;
    }

    if (currentSection.includes('population') && !ward.population) {
      const popMatch = cleanedLine.match(/([\d.,]+)/);
      if (popMatch) ward.population = popMatch[1].replace(/,/g, '');
      continue;
    }

    if (currentSection.includes('description')) {
      if (cleanedLine) descriptionParts.push(cleanedLine);
      continue;
    }
  }

  flushItem();
  if (currentSection.includes('description') && descriptionParts.length > 0) {
    ward.description = descriptionParts.join(' ').trim();
  }

  return ward;
}

/**
 * Parse CSV data for ward information (Area and Population ONLY)
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
 * Build old name index
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
