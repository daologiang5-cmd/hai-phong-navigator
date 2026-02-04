import { Ward } from '@/types/ward';
import { parseMarkdownWards, parseCSV, buildOldNameIndex, normalizeToSlug } from '@/utils/parseMarkdown';

// Import all markdown files
import wardsPart01 from './wards_part_01.md?raw';
import wardsPart02 from './wards_part_02.md?raw';
import wardsPart03 from './wards_part_03.md?raw';
import wardsPart04 from './wards_part_04.md?raw';
import wardsPart05 from './wards_part_05.md?raw';
import wardsPart06 from './wards_part_06.md?raw';
import wardsPart07 from './wards_part_07.md?raw';
import wardsPart08 from './wards_part_08.md?raw';
import wardsCSV from './wards.csv?raw';

// Parse all markdown files
const allMarkdownContent = [
  wardsPart01,
  wardsPart02,
  wardsPart03,
  wardsPart04,
  wardsPart05,
  wardsPart06,
  wardsPart07,
  wardsPart08,
].join('\n\n');

// Parse wards from markdown ONLY (single source of truth for sidebar)
const parsedWards = parseMarkdownWards(allMarkdownContent);

// Parse CSV data (for area/population enrichment only)
const csvData = parseCSV(wardsCSV);

// STRICT DEDUPLICATION: Use normalized slug as key
const uniqueWardsMap = new Map<string, Ward>();

// ONLY add wards from Markdown # headings (NOT from CSV)
parsedWards.forEach(ward => {
  const normalizedName = ward.name.trim();
  const slug = normalizeToSlug(normalizedName);
  
  // Skip if we already have this ward (by slug)
  if (uniqueWardsMap.has(slug)) {
    console.log(`[Ward Data] Duplicate ward skipped: ${normalizedName}`);
    return;
  }
  
  // Find CSV data by trying exact match first, then normalized match
  let csvInfo = csvData.get(normalizedName);
  if (!csvInfo) {
    // Try to find by matching slug
    for (const [csvName, data] of csvData) {
      if (normalizeToSlug(csvName) === slug) {
        csvInfo = data;
        break;
      }
    }
  }
  
  // Determine area and population - prefer CSV for these as they have structured data
  let area = ward.area || '';
  let population = ward.population || '';
  
  if (csvInfo) {
    if (csvInfo.area) area = csvInfo.area;
    if (csvInfo.population) population = csvInfo.population;
  }
  
  // Add " người" suffix if population is just a number
  if (population && !population.includes('người') && /^\d+$/.test(population.replace(/\D/g, ''))) {
    // Keep population as number, view will add suffix
  }
  
  uniqueWardsMap.set(slug, {
    ...ward,
    name: normalizedName,
    area: area || 'N/A',
    population: population || 'N/A',
    // Keep mergedFrom from markdown - this is the authoritative source
    mergedFrom: ward.mergedFrom.length > 0 
      ? ward.mergedFrom 
      : csvInfo?.mergedFrom 
        ? csvInfo.mergedFrom.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : [],
  });
});

// Validation: Log warning if count is not expected
const wardCount = uniqueWardsMap.size;
console.log(`[Ward Data] Total unique wards: ${wardCount}`);

// Convert map to array and sort alphabetically
export const wards: Ward[] = Array.from(uniqueWardsMap.values())
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

// Build old name to new name index
export const oldNameIndex = buildOldNameIndex(wards);

// Get ward by name
export function getWardByName(name: string): Ward | undefined {
  return wards.find(w => w.name.toLowerCase() === name.toLowerCase());
}

// Search wards by name (new or old)
export function searchWards(query: string): Ward[] {
  if (!query.trim()) return wards;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return wards.filter(ward => {
    // Check ward name
    if (ward.name.toLowerCase().includes(lowerQuery)) return true;
    
    // Check merged from names
    for (const oldName of ward.mergedFrom) {
      if (oldName.toLowerCase().includes(lowerQuery)) return true;
    }
    
    return false;
  });
}

// Look up new ward name from old ward name
export function lookupOldWardName(oldName: string): string | null {
  const lowerName = oldName.toLowerCase().trim();
  
  // Direct lookup
  const directMatch = oldNameIndex.get(lowerName);
  if (directMatch) return directMatch;
  
  // Partial match
  for (const [key, value] of oldNameIndex) {
    if (key.includes(lowerName) || lowerName.includes(key)) {
      return value;
    }
  }
  
  return null;
}

// Answer chatbot questions based on ward data ONLY
export function answerQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  // Extract ward name from question
  let targetWard: Ward | undefined;
  
  // First try exact matches for ward names
  for (const ward of wards) {
    if (lowerQuestion.includes(ward.name.toLowerCase())) {
      targetWard = ward;
      break;
    }
  }
  
  // If not found, try old names
  if (!targetWard) {
    for (const ward of wards) {
      for (const oldName of ward.mergedFrom) {
        const cleanName = oldName.replace(/\s*\([^)]*\)/g, '').trim();
        if (lowerQuestion.includes(cleanName.toLowerCase())) {
          targetWard = ward;
          break;
        }
      }
      if (targetWard) break;
    }
  }
  
  if (!targetWard) {
    return 'Dữ liệu hiện không có trong hệ thống. Vui lòng nhập tên phường/xã cụ thể để tra cứu.';
  }
  
  // Determine what information is being asked
  if (lowerQuestion.includes('đặc sản') || lowerQuestion.includes('món ăn') || lowerQuestion.includes('ẩm thực')) {
    if (targetWard.specialties.length === 0) {
      return `Chưa có dữ liệu chi tiết về đặc sản của ${targetWard.name}.`;
    }
    return `**Đặc sản của ${targetWard.name}:**\n${targetWard.specialties.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }
  
  if (lowerQuestion.includes('sáp nhập') || lowerQuestion.includes('từ đâu') || lowerQuestion.includes('gộp từ') || lowerQuestion.includes('trước đây')) {
    if (targetWard.mergedFrom.length === 0) {
      return `Chưa có dữ liệu chi tiết về nguồn gốc sáp nhập của ${targetWard.name}.`;
    }
    return `**${targetWard.name} được sáp nhập từ:**\n${targetWard.mergedFrom.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
  }
  
  if (lowerQuestion.includes('dân số') || lowerQuestion.includes('bao nhiêu người') || lowerQuestion.includes('số dân')) {
    return `**Dân số của ${targetWard.name}:** ${targetWard.population} người`;
  }
  
  if (lowerQuestion.includes('diện tích') || lowerQuestion.includes('rộng') || lowerQuestion.includes('km')) {
    return `**Diện tích của ${targetWard.name}:** ${targetWard.area}`;
  }
  
  if (lowerQuestion.includes('địa điểm') || lowerQuestion.includes('danh lam') || lowerQuestion.includes('di tích') || lowerQuestion.includes('tham quan') || lowerQuestion.includes('du lịch')) {
    if (targetWard.landmarks.length === 0) {
      return `Chưa có dữ liệu chi tiết về địa điểm nổi bật của ${targetWard.name}.`;
    }
    return `**Địa điểm nổi bật của ${targetWard.name}:**\n${targetWard.landmarks.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
  }
  
  if (lowerQuestion.includes('mô tả') || lowerQuestion.includes('giới thiệu') || lowerQuestion.includes('thông tin')) {
    if (!targetWard.description) {
      return `Chưa có dữ liệu chi tiết mô tả về ${targetWard.name}.`;
    }
    return `**Mô tả về ${targetWard.name}:**\n${targetWard.description}`;
  }
  
  // Default: return overview
  let response = `**Thông tin về ${targetWard.name}:**\n`;
  response += `- **Diện tích:** ${targetWard.area}\n`;
  response += `- **Dân số:** ${targetWard.population} người\n`;
  
  if (targetWard.mergedFrom.length > 0) {
    response += `- **Sáp nhập từ:** ${targetWard.mergedFrom.join(', ')}\n`;
  }
  
  if (targetWard.description) {
    response += `\n**Mô tả:** ${targetWard.description}`;
  }
  
  return response;
}
