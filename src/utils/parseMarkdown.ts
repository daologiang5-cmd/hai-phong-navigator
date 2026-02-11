import { Ward, WardItem } from '@/types/ward';

/**
 * Normalize ward name for exact comparison (preserves diacritics)
 */
export function normalizeWardName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Clean markdown formatting from text
 */
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\\#/g, '#')
    .replace(/\\&/g, '&')
    .replace(/\\/g, '')
    .replace(/^#+\s*/, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a line is a ward header (level 1 heading)
 */
function parseWardHeader(line: string): string | null {
  const trimmed = line.trim();

  const escapedHashMatch = trimmed.match(/^#{1,6}\s*\\#\s+([^#\n]+?)\s*$/);
  if (escapedHashMatch) return cleanText(escapedHashMatch[1]);

  const boldHashMatch = trimmed.match(/^\*\*#\s+(.+?)\*\*\s*$/);
  if (boldHashMatch) return cleanText(boldHashMatch[1]);

  if (trimmed.match(/^#\s+[^#]/) && !trimmed.startsWith('##')) {
    const match = trimmed.match(/^#\s+(.+?)\s*$/);
    if (match) return cleanText(match[1]);
  }

  return null;
}

/**
 * Check if a line is a section header (## Section)
 */
function parseSectionHeader(line: string): string | null {
  const trimmed = line.trim();

  const escapedMatch = trimmed.match(/^#{1,6}\s*\\##\s+(.+?)\s*$/);
  if (escapedMatch) return cleanText(escapedMatch[1]).toLowerCase();

  const boldMatch = trimmed.match(/^\*\*##\s+(.+?)\*\*\s*$/);
  if (boldMatch) return cleanText(boldMatch[1]).toLowerCase();

  if (trimmed.match(/^##\s+[^#]/) && !trimmed.includes('\\#')) {
    const match = trimmed.match(/^##\s+(.+?)\s*$/);
    if (match) {
      const section = cleanText(match[1]).toLowerCase();
      if (section.includes('merged') || section.includes('area') ||
          section.includes('population') || section.includes('landmark') ||
          section.includes('special') || section.includes('description')) {
        return section;
      }
    }
  }

  return null;
}

/**
 * Check if a line is a bullet item
 */
function parseBulletItem(line: string): string | null {
  const trimmed = line.trim();

  const mdBulletMatch = trimmed.match(/^#{1,6}\s*[·•]\s*(.+?)\s*$/);
  if (mdBulletMatch) return cleanText(mdBulletMatch[1]);

  const boldBulletMatch = trimmed.match(/^\*\*[·•]\s*(.+?)\*\*\s*$/);
  if (boldBulletMatch) return cleanText(boldBulletMatch[1]);

  const plainBulletMatch = trimmed.match(/^[·•]\s*(.+?)\s*$/);
  if (plainBulletMatch) return cleanText(plainBulletMatch[1]);

  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    const content = cleanText(trimmed.slice(2));
    if (content &&
        !content.toLowerCase().match(/^merged\s+from$/i) &&
        !content.toLowerCase().match(/^area$/i) &&
        !content.toLowerCase().match(/^population$/i) &&
        !content.toLowerCase().match(/^landmarks?$/i) &&
        !content.toLowerCase().match(/^specialties?$/i) &&
        !content.toLowerCase().match(/^description$/i)) {
      return content;
    }
  }

  return null;
}

/**
 * Extract image URL from a line (image:URL or standalone URL pointing to image)
 */
function extractImageUrl(line: string): string | null {
  const trimmed = line.trim()
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/, '')
    .trim();

  // Pattern: image:URL (with or without space)
  const imageTagMatch = trimmed.match(/^image:\s*(https?:\/\/\S+)/i);
  if (imageTagMatch) return imageTagMatch[1];

  return null;
}

/**
 * Extract image URLs embedded in a text string
 */
function extractInlineImageUrls(text: string): string[] {
  const urls: string[] = [];
  // Match URLs ending with image extensions
  const urlRegex = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[0]);
  }
  return urls;
}

/**
 * Parse ward data from markdown content with STRICT BOUNDARY ISOLATION
 */
export function parseMarkdownWards(content: string): Ward[] {
  const lines = content.split('\n');
  const wards: Ward[] = [];

  const wardBoundaries: { startLine: number; name: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const wardName = parseWardHeader(lines[i]);
    if (wardName) {
      wardBoundaries.push({ startLine: i, name: wardName });
    }
  }

  for (let w = 0; w < wardBoundaries.length; w++) {
    const startLine = wardBoundaries[w].startLine;
    const endLine = w + 1 < wardBoundaries.length
      ? wardBoundaries[w + 1].startLine
      : lines.length;

    const wardLines = lines.slice(startLine, endLine);
    const ward = parseWardBlock(wardBoundaries[w].name, wardLines);
    if (ward) wards.push(ward);
  }

  return wards;
}

/**
 * Parse a single ward block with image support
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
  let currentBulletParts: string[] = [];
  let currentBulletImages: string[] = [];
  let descriptionParts: string[] = [];

  const flushBullet = () => {
    if (currentBulletParts.length > 0) {
      const fullText = currentBulletParts.join(' ').trim();
      if (fullText) {
        // Also extract inline image URLs from text
        const inlineImages = extractInlineImageUrls(fullText);
        const allImages = [...currentBulletImages, ...inlineImages];

        const item: WardItem = { text: fullText, images: allImages };

        if (currentSection.includes('merged') || currentSection.includes('from')) {
          ward.mergedFrom.push(fullText);
        } else if (currentSection.includes('landmark')) {
          ward.landmarks.push(item);
        } else if (currentSection.includes('special')) {
          ward.specialties.push(item);
        }
      }
      currentBulletParts = [];
      currentBulletImages = [];
    }
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed === '&nbsp;') continue;

    // Check for image URL line (belongs to current bullet)
    const imageUrl = extractImageUrl(line);
    if (imageUrl && currentBulletParts.length > 0) {
      currentBulletImages.push(imageUrl);
      continue;
    }

    const sectionName = parseSectionHeader(line);
    if (sectionName) {
      flushBullet();
      if (currentSection.includes('description') && descriptionParts.length > 0) {
        ward.description = descriptionParts.join(' ').trim();
        descriptionParts = [];
      }
      currentSection = sectionName;
      continue;
    }

    const bulletContent = parseBulletItem(line);
    if (bulletContent) {
      flushBullet();
      currentBulletParts.push(bulletContent);
      continue;
    }

    if (!currentSection) continue;

    // Handle "- name:" and "description:" structured format
    const cleanedLine = cleanText(trimmed);

    // Check for "- name: ..." format (new bullet with name/description structure)
    const nameMatch = cleanedLine.match(/^-\s*name:\s*(.+)/i);
    if (nameMatch && (currentSection.includes('landmark') || currentSection.includes('special') || currentSection.includes('merged'))) {
      flushBullet();
      currentBulletParts.push(nameMatch[1].trim());
      continue;
    }

    // Check for "description: ..." continuation
    const descMatch = cleanedLine.match(/^\s*description:\s*(.+)/i);
    if (descMatch && currentBulletParts.length > 0) {
      currentBulletParts.push('-- ' + descMatch[1].trim());
      continue;
    }

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

    // Multi-line bullet continuation
    if (currentBulletParts.length > 0) {
      if (cleanedLine) currentBulletParts.push(cleanedLine);
    }
  }

  flushBullet();
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
