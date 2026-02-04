import { Ward } from '@/types/ward';

/**
 * Normalize ward name to slug (lowercase, no diacritics)
 * Used for deduplication
 */
export function normalizeToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ');
}

/**
 * Parse ward data from markdown content
 * Each ward starts with # WARD_NAME (with various markdown escapes)
 * Sections are identified by ## Section Name
 */
export function parseMarkdownWards(content: string): Ward[] {
  const wards: Ward[] = [];
  
  // Clean up markdown escape sequences
  const cleanContent = content
    .replace(/\\#/g, '#')
    .replace(/\\\*/g, '*')
    .replace(/\\&/g, '&');
  
  // Split by ward headers - match various formats like:
  // # WARD_NAME, ### # WARD_NAME, **# WARD_NAME**, ## # WARD_NAME
  const wardSections = cleanContent.split(/(?=(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?#\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s]+(?:\*\*)?)/i);
  
  for (const section of wardSections) {
    if (!section.trim()) continue;
    
    const ward = parseWardSection(section);
    if (ward && ward.name) {
      wards.push(ward);
    }
  }
  
  return wards;
}

function parseWardSection(section: string): Ward | null {
  // Extract ward name from header
  const nameMatch = section.match(/(?:#{1,3}\s*)?(?:\*\*)?#\s+([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐA-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+?)(?:\*\*)?\s*$/mi);
  
  if (!nameMatch) return null;
  
  const name = nameMatch[1].trim();
  
  // Extract sections
  const mergedFrom = extractListSection(section, 'Merged From');
  const area = extractTextSection(section, 'Area');
  const population = extractTextSection(section, 'Population');
  const landmarks = extractListSection(section, 'Landmarks');
  const specialties = extractListSection(section, 'Specialties');
  const description = extractTextSection(section, 'Description');
  
  return {
    name,
    mergedFrom,
    area,
    population,
    landmarks,
    specialties,
    description,
  };
}

function extractListSection(content: string, sectionName: string): string[] {
  // Match section header with various formats
  const regex = new RegExp(
    `(?:#{2,3}\\s*)?(?:\\*\\*)?##\\s*${sectionName}(?:\\*\\*)?[\\s\\S]*?(?=(?:#{2,3}\\s*)?(?:\\*\\*)?##|$)`,
    'i'
  );
  
  const match = content.match(regex);
  if (!match) return [];
  
  const sectionContent = match[0];
  const items: string[] = [];
  
  // Extract bullet points (lines starting with * or -)
  const bulletRegex = /^\s*[*-]\s+(?:\*\*)?(.+?)(?:\*\*)?$/gm;
  let bulletMatch;
  
  while ((bulletMatch = bulletRegex.exec(sectionContent)) !== null) {
    const item = bulletMatch[1]
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (item && !item.toLowerCase().includes(sectionName.toLowerCase())) {
      items.push(item);
    }
  }
  
  return items;
}

function extractTextSection(content: string, sectionName: string): string {
  const regex = new RegExp(
    `(?:#{2,3}\\s*)?(?:\\*\\*)?##\\s*${sectionName}(?:\\*\\*)?\\s*([\\s\\S]*?)(?=(?:#{2,3}\\s*)?(?:\\*\\*)?##|$)`,
    'i'
  );
  
  const match = content.match(regex);
  if (!match) return '';
  
  // Clean up the extracted text
  let text = match[1]
    .replace(/\*\*/g, '')
    .replace(/^\s*[*-]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // For Area and Population, just get the first line/value
  if (sectionName === 'Area' || sectionName === 'Population') {
    const firstLine = text.split(/\s{2,}/)[0];
    return firstLine || text;
  }
  
  return text;
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
