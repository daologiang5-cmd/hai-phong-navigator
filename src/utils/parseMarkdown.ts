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
 * Check if a line is a ward header
 * Returns the ward name if matched, null otherwise
 */
function parseWardHeader(line: string): string | null {
  const trimmed = line.trim();
  
  // Various formats:
  // ### \# WARD_NAME, ## \# WARD_NAME, **# WARD_NAME**, # WARD_NAME
  // Also handle: ### # WARD, ## # WARD
  const patterns = [
    /^(?:#{1,3}\s*)?(?:\*\*)?\s*\\?#\s+([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐA-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+?)(?:\*\*)?\s*$/,
    /^@([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐA-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+)\s*$/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return cleanText(match[1]);
    }
  }
  
  return null;
}

/**
 * Check if a line is a section header (## Section Name)
 * Returns the section name if matched, null otherwise
 */
function parseSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  
  // Match: ## Section, ### ## Section, **## Section**, ## \## Section
  const match = trimmed.match(/^(?:#{1,3}\s*)?(?:\*\*)?\s*\\?##\s+(.+?)(?:\*\*)?\s*$/);
  if (match) {
    return cleanText(match[1]).toLowerCase();
  }
  
  return null;
}

/**
 * Check if a line is a bullet item
 * Returns the bullet content if matched, null otherwise
 */
function parseBulletItem(line: string): string | null {
  const trimmed = line.trim();
  
  // Match various bullet formats:
  // · Item, • Item, - Item, * Item
  // ## · Item, ### · Item, **· Item**
  // Also handle lines that start with ## · or ### · directly
  const patterns = [
    /^(?:#{1,3}\s*)?(?:\*\*)?\s*[·•\-\*]\s*(.+?)(?:\*\*)?\s*$/,
    /^(?:#{1,3}\s+)[·•\-\*]\s+(.+?)\s*$/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const content = cleanText(match[1]);
      // Filter out section headers that might match
      if (content && 
          !content.toLowerCase().includes('merged from') &&
          !content.toLowerCase().match(/^area$/i) &&
          !content.toLowerCase().match(/^population$/i) &&
          !content.toLowerCase().match(/^landmarks$/i) &&
          !content.toLowerCase().match(/^specialties$/i) &&
          !content.toLowerCase().match(/^description$/i)) {
        return content;
      }
    }
  }
  
  return null;
}

/**
 * Parse ward data from markdown content
 * Handles multiple formats:
 * - ### \# WARD_NAME
 * - ## \# WARD_NAME  
 * - **# WARD_NAME**
 * - # WARD_NAME
 */
export function parseMarkdownWards(content: string): Ward[] {
  const wards: Ward[] = [];
  
  // First, clean up the content
  let cleanContent = content
    .replace(/\\#/g, '#')
    .replace(/\\\*/g, '*')
    .replace(/\\&/g, '&');
  
  // Split into lines for processing
  const lines = cleanContent.split('\n');
  
  let currentWard: Partial<Ward> | null = null;
  let currentSection = '';
  let sectionContent: string[] = [];
  let descriptionLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines (but don't reset section)
    if (!trimmedLine || trimmedLine === '&nbsp;') {
      continue;
    }
    
    // Check for ward header
    const wardName = parseWardHeader(trimmedLine);
    if (wardName) {
      // Save previous ward if exists
      if (currentWard && currentWard.name) {
        // Process any remaining section
        if (currentSection && sectionContent.length > 0) {
          assignSection(currentWard, currentSection, sectionContent, descriptionLines);
        }
        wards.push(currentWard as Ward);
      }
      
      // Start new ward
      currentWard = {
        name: wardName,
        mergedFrom: [],
        area: '',
        population: '',
        landmarks: [],
        specialties: [],
        description: '',
      };
      currentSection = '';
      sectionContent = [];
      descriptionLines = [];
      continue;
    }
    
    // Check for section header
    const sectionName = parseSectionHeader(trimmedLine);
    if (sectionName && currentWard) {
      // Save previous section
      if (currentSection && (sectionContent.length > 0 || descriptionLines.length > 0)) {
        assignSection(currentWard, currentSection, sectionContent, descriptionLines);
      }
      
      currentSection = sectionName;
      sectionContent = [];
      descriptionLines = [];
      continue;
    }
    
    // If we're in a section, try to parse content
    if (currentWard && currentSection) {
      // Check for bullet item
      const bulletContent = parseBulletItem(trimmedLine);
      if (bulletContent) {
        sectionContent.push(bulletContent);
        continue;
      }
      
      // Handle plain text for Area, Population, Description sections
      const plainText = cleanText(trimmedLine);
      if (plainText && plainText !== '#' && plainText !== '##') {
        // For Area and Population, take the first line only
        if (currentSection === 'area' || currentSection === 'population') {
          if (sectionContent.length === 0) {
            sectionContent.push(plainText);
          }
        } else if (currentSection === 'description') {
          // For description, accumulate text
          descriptionLines.push(plainText);
        }
      }
    }
  }
  
  // Don't forget the last ward
  if (currentWard && currentWard.name) {
    if (currentSection && (sectionContent.length > 0 || descriptionLines.length > 0)) {
      assignSection(currentWard, currentSection, sectionContent, descriptionLines);
    }
    wards.push(currentWard as Ward);
  }
  
  console.log(`[ParseMarkdown] Parsed ${wards.length} wards`);
  
  return wards;
}

function assignSection(ward: Partial<Ward>, section: string, content: string[], descriptionLines: string[]): void {
  const sectionLower = section.toLowerCase();
  
  if (sectionLower.includes('merged') || sectionLower.includes('from')) {
    ward.mergedFrom = content.filter(Boolean);
  } else if (sectionLower.includes('area')) {
    ward.area = content[0] || '';
  } else if (sectionLower.includes('population')) {
    ward.population = content[0] || '';
  } else if (sectionLower.includes('landmark')) {
    ward.landmarks = content.filter(Boolean);
  } else if (sectionLower.includes('special')) {
    ward.specialties = content.filter(Boolean);
  } else if (sectionLower.includes('description')) {
    // For description, join all lines including both content and descriptionLines
    const allText = [...content, ...descriptionLines].filter(Boolean);
    ward.description = allText.join(' ').trim();
  }
}

/**
 * Parse CSV data for ward information
 */
export function parseCSV(content: string): Map<string, { population: string; area: string; mergedFrom: string }> {
  const lines = content.trim().split('\n');
  const map = new Map();
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV considering quoted fields
    const values = parseCSVLine(line);
    if (values.length >= 4) {
      const name = values[0].trim();
      const mergedFrom = values[1].trim();
      const population = values[2].trim();
      const area = values[3].trim();
      
      if (name) {
        map.set(name, { population, area: `${area} km²`, mergedFrom });
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
 * Build a search index for old ward names to new ward names
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
  
  return index;
}
