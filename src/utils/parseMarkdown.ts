import { Ward } from '@/types/ward';

/**
 * Normalize ward name for exact comparison (preserves diacritics)
 * Used for deduplication - NO accent stripping
 */
export function normalizeWardName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ');  // Only normalize whitespace, preserve all diacritics
}

/**
 * Clean markdown formatting from text
 */
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')           // Remove bold markers
    .replace(/\\#/g, '#')           // Unescape #
    .replace(/\\&/g, '&')           // Unescape &
    .replace(/\\/g, '')             // Remove remaining escapes
    .replace(/^#+\s*/, '')          // Remove leading # markers
    .replace(/&nbsp;/g, ' ')        // Replace nbsp
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
}

/**
 * Check if a line is a ward header (level 1 heading)
 * Returns the ward name if matched, null otherwise
 * 
 * Supported formats:
 * - ### \# WARD_NAME
 * - ## \# WARD_NAME  
 * - **# WARD_NAME**
 * - # WARD_NAME
 */
function parseWardHeader(line: string): string | null {
  const trimmed = line.trim();
  
  // Pattern 1: ### \# WARD or ## \# WARD (escaped hash with markdown heading)
  const escapedHashMatch = trimmed.match(/^#{1,6}\s*\\#\s+([^#\n]+?)\s*$/);
  if (escapedHashMatch) {
    return cleanText(escapedHashMatch[1]);
  }
  
  // Pattern 2: **# WARD NAME** (bold with hash)
  const boldHashMatch = trimmed.match(/^\*\*#\s+(.+?)\*\*\s*$/);
  if (boldHashMatch) {
    return cleanText(boldHashMatch[1]);
  }
  
  // Pattern 3: Plain # WARD (level 1 only, not ## or ###)
  if (trimmed.match(/^#\s+[^#]/) && !trimmed.startsWith('##')) {
    const match = trimmed.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return cleanText(match[1]);
    }
  }
  
  return null;
}

/**
 * Check if a line is a section header (## Section)
 * Returns the section name in lowercase if matched
 */
function parseSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  
  // Pattern 1: ### \## or ## \## (escaped double hash)
  const escapedMatch = trimmed.match(/^#{1,6}\s*\\##\s+(.+?)\s*$/);
  if (escapedMatch) {
    return cleanText(escapedMatch[1]).toLowerCase();
  }
  
  // Pattern 2: **## Section** (bold section)
  const boldMatch = trimmed.match(/^\*\*##\s+(.+?)\*\*\s*$/);
  if (boldMatch) {
    return cleanText(boldMatch[1]).toLowerCase();
  }
  
  // Pattern 3: ## Section (plain, but not \# ward header)
  if (trimmed.match(/^##\s+[^#]/) && !trimmed.includes('\\#')) {
    const match = trimmed.match(/^##\s+(.+?)\s*$/);
    if (match) {
      const section = cleanText(match[1]).toLowerCase();
      // Make sure it's a known section, not a ward name
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
 * Returns the bullet content if matched
 */
function parseBulletItem(line: string): string | null {
  const trimmed = line.trim();
  
  // Pattern 1: ### · or ## · (markdown heading with bullet)
  const mdBulletMatch = trimmed.match(/^#{1,6}\s*[·•]\s*(.+?)\s*$/);
  if (mdBulletMatch) {
    return cleanText(mdBulletMatch[1]);
  }
  
  // Pattern 2: **· Item** (bold bullet)
  const boldBulletMatch = trimmed.match(/^\*\*[·•]\s*(.+?)\*\*\s*$/);
  if (boldBulletMatch) {
    return cleanText(boldBulletMatch[1]);
  }
  
  // Pattern 3: · Item or • Item (plain bullet)
  const plainBulletMatch = trimmed.match(/^[·•]\s*(.+?)\s*$/);
  if (plainBulletMatch) {
    return cleanText(plainBulletMatch[1]);
  }
  
  // Pattern 4: - Item (dash bullet, but not section headers)
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    const content = cleanText(trimmed.slice(2));
    // Filter out section headers
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
 * Parse ward data from markdown content with STRICT BOUNDARY ISOLATION
 * Each ward only gets data from within its own block (from # heading to next # heading)
 */
export function parseMarkdownWards(content: string): Ward[] {
  const lines = content.split('\n');
  const wards: Ward[] = [];
  
  // Step 1: Find all ward header positions
  const wardBoundaries: { startLine: number; name: string }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const wardName = parseWardHeader(lines[i]);
    if (wardName) {
      wardBoundaries.push({ startLine: i, name: wardName });
    }
  }
  
  console.log(`[Parser] Found ${wardBoundaries.length} ward headers`);
  
  // Step 2: Parse each ward block with strict boundaries
  for (let w = 0; w < wardBoundaries.length; w++) {
    const startLine = wardBoundaries[w].startLine;
    const endLine = w + 1 < wardBoundaries.length 
      ? wardBoundaries[w + 1].startLine 
      : lines.length;
    
    // Extract ONLY lines within this ward's block
    const wardLines = lines.slice(startLine, endLine);
    
    // Parse this isolated block
    const ward = parseWardBlock(wardBoundaries[w].name, wardLines);
    if (ward) {
      wards.push(ward);
    }
  }
  
  console.log(`[Parser] Total wards parsed: ${wards.length}`);
  return wards;
}

/**
 * Parse a single ward block (isolated from other wards)
 * This ensures NO cross-ward data mixing
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
  let currentBulletParts: string[] = []; // For multi-line bullets
  let descriptionParts: string[] = [];
  
  // Helper: Flush accumulated bullet to the appropriate array
  const flushBullet = () => {
    if (currentBulletParts.length > 0) {
      const fullText = currentBulletParts.join(' ').trim();
      if (fullText) {
        if (currentSection.includes('merged') || currentSection.includes('from')) {
          ward.mergedFrom.push(fullText);
        } else if (currentSection.includes('landmark')) {
          ward.landmarks.push(fullText);
        } else if (currentSection.includes('special')) {
          ward.specialties.push(fullText);
        }
      }
      currentBulletParts = [];
    }
  };
  
  // Process each line (skip first line - the ward header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed || trimmed === '&nbsp;') {
      continue;
    }
    
    // Check for section header
    const sectionName = parseSectionHeader(line);
    if (sectionName) {
      // Flush pending bullet before switching sections
      flushBullet();
      
      // Flush description if we were in description section
      if (currentSection.includes('description') && descriptionParts.length > 0) {
        ward.description = descriptionParts.join(' ').trim();
        descriptionParts = [];
      }
      
      currentSection = sectionName;
      continue;
    }
    
    // Check for bullet item
    const bulletContent = parseBulletItem(line);
    if (bulletContent) {
      // Flush previous bullet first
      flushBullet();
      currentBulletParts.push(bulletContent);
      continue;
    }
    
    // If we have no section yet, skip
    if (!currentSection) continue;
    
    // Handle Area section (single value)
    if (currentSection.includes('area') && !ward.area) {
      const cleanedLine = cleanText(trimmed);
      // Extract area value (number with km²)
      const areaMatch = cleanedLine.match(/([\d.,]+)\s*km[²2]?/i);
      if (areaMatch) {
        ward.area = `${areaMatch[1]} km²`;
      } else {
        // Just take the numeric part
        const numMatch = cleanedLine.match(/([\d.,]+)/);
        if (numMatch) {
          ward.area = `${numMatch[1]} km²`;
        }
      }
      continue;
    }
    
    // Handle Population section (single value)
    if (currentSection.includes('population') && !ward.population) {
      const cleanedLine = cleanText(trimmed);
      const popMatch = cleanedLine.match(/([\d.,]+)/);
      if (popMatch) {
        ward.population = popMatch[1].replace(/,/g, '');
      }
      continue;
    }
    
    // Handle Description section (accumulate text)
    if (currentSection.includes('description')) {
      const cleanedLine = cleanText(trimmed);
      if (cleanedLine) {
        descriptionParts.push(cleanedLine);
      }
      continue;
    }
    
    // Handle continuation of multi-line bullets (for landmarks/specialties/merged)
    if (currentBulletParts.length > 0) {
      const cleanedLine = cleanText(trimmed);
      if (cleanedLine) {
        currentBulletParts.push(cleanedLine);
      }
    }
  }
  
  // Flush any remaining data
  flushBullet();
  if (currentSection.includes('description') && descriptionParts.length > 0) {
    ward.description = descriptionParts.join(' ').trim();
  }
  
  console.log(`[Parser] Ward "${ward.name}": Landmarks=${ward.landmarks.length}, Specialties=${ward.specialties.length}, MergedFrom=${ward.mergedFrom.length}`);
  
  return ward;
}

/**
 * Parse CSV data for ward information (Area and Population ONLY)
 */
export function parseCSV(content: string): Map<string, { population: string; area: string }> {
  const lines = content.trim().split('\n');
  const map = new Map<string, { population: string; area: string }>();
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line
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
  
  console.log(`[CSV] Loaded ${map.size} entries`);
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
 * Build a search index for old ward names to new ward names
 * Uses exact matching with diacritics preserved
 */
export function buildOldNameIndex(wards: Ward[]): Map<string, string> {
  const index = new Map<string, string>();
  
  for (const ward of wards) {
    // Add the ward name itself
    index.set(ward.name.toLowerCase(), ward.name);
    
    // Add all merged from names
    for (const oldName of ward.mergedFrom) {
      // Extract just the name part (remove annotations like "một phần")
      const cleanName = oldName
        .replace(/\s*\([^)]*\)/g, '')
        .trim();
      
      if (cleanName) {
        index.set(cleanName.toLowerCase(), ward.name);
      }
    }
  }
  
  console.log(`[Index] Built old name index with ${index.size} entries`);
  return index;
}
