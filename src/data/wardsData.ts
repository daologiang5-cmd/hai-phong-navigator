import { Ward } from '@/types/ward';
import { parseMarkdownWards, parseCSV, buildOldNameIndex, normalizeWardName } from '@/utils/parseMarkdown';

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

// Parse wards from EACH markdown file separately to ensure proper boundary detection
const parsedWards: Ward[] = [
  ...parseMarkdownWards(wardsPart01),
  ...parseMarkdownWards(wardsPart02),
  ...parseMarkdownWards(wardsPart03),
  ...parseMarkdownWards(wardsPart04),
  ...parseMarkdownWards(wardsPart05),
  ...parseMarkdownWards(wardsPart06),
  ...parseMarkdownWards(wardsPart07),
  ...parseMarkdownWards(wardsPart08),
];

console.log(`[Ward Data] Total wards from all markdown files: ${parsedWards.length}`);

// Parse CSV data (for area/population enrichment only)
const csvData = parseCSV(wardsCSV);

// STRICT DEDUPLICATION: Use EXACT ward name (with full diacritics) as key
// "Cẩm Giàng" and "Cẩm Giang" are SEPARATE wards - DO NOT merge them
const uniqueWardsMap = new Map<string, Ward>();

parsedWards.forEach(ward => {
  const exactName = normalizeWardName(ward.name);
  
  // Skip if we already have this EXACT ward name (case-sensitive with diacritics)
  if (uniqueWardsMap.has(exactName)) {
    console.log(`[Ward Data] Duplicate skipped (exact match): "${exactName}"`);
    return;
  }
  
  // Find CSV data by EXACT match first
  let csvInfo = csvData.get(exactName);
  
  // Try case-insensitive match (but diacritic-preserving)
  if (!csvInfo) {
    for (const [csvName, data] of csvData) {
      if (normalizeWardName(csvName).toLowerCase() === exactName.toLowerCase()) {
        csvInfo = data;
        break;
      }
    }
  }
  
  // Use CSV for area/population if available, otherwise use markdown values
  let area = ward.area || '';
  let population = ward.population || '';
  
  if (csvInfo) {
    if (csvInfo.area) area = csvInfo.area;
    if (csvInfo.population) population = csvInfo.population;
  }
  
  // Store the ward with its OWN isolated data (no cross-ward mixing)
  uniqueWardsMap.set(exactName, {
    name: exactName,
    area: area || 'N/A',
    population: population || 'N/A',
    // CRITICAL: These come ONLY from this ward's markdown block
    mergedFrom: ward.mergedFrom,
    landmarks: ward.landmarks,
    specialties: ward.specialties,
    description: ward.description,
  });
});

// Final validation
const wardCount = uniqueWardsMap.size;
console.log(`[Ward Data] Final unique wards: ${wardCount}`);

// List wards with similar names for verification
const wardNames = Array.from(uniqueWardsMap.keys()).sort((a, b) => a.localeCompare(b, 'vi'));
const similarNames = wardNames.filter(n => n.toLowerCase().includes('cẩm'));
if (similarNames.length > 0) {
  console.log(`[Ward Data] Wards with "Cẩm": ${similarNames.join(', ')}`);
}

// Convert map to array and sort alphabetically (Vietnamese)
export const wards: Ward[] = Array.from(uniqueWardsMap.values())
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

// Build old name to new name index
export const oldNameIndex = buildOldNameIndex(wards);

// Get ward by name (exact match with diacritics)
export function getWardByName(name: string): Ward | undefined {
  const normalized = normalizeWardName(name);
  return wards.find(w => w.name === normalized || w.name.toLowerCase() === normalized.toLowerCase());
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

const NO_DATA_MSG =
  'Hiện tại dữ liệu chính thức về khu vực này chưa được cập nhật trong tài liệu sáp nhập. Bạn có thể kiểm tra trực tiếp trên bản đồ.';

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatWardSummary(w: Ward): string {
  const lines: string[] = [];
  lines.push(`**Phường/Xã ${w.name}**`);
  if (w.mergedFrom.length) {
    lines.push(`\n**Nguồn gốc:** ${w.mergedFrom.join(', ')}`);
  }
  lines.push(`\n**Thông số:** Diện tích ${w.area} · Dân số ${w.population} người`);
  if (w.landmarks.length) {
    lines.push(`\n**Điểm đến:**`);
    w.landmarks.forEach((l) => lines.push(`- ${l.text}`));
  }
  if (w.specialties.length) {
    lines.push(`\n**Đặc sản:**`);
    w.specialties.forEach((s) => lines.push(`- ${s.text}`));
  }
  if (w.description) {
    lines.push(`\n**Mô tả ngắn:** ${w.description}`);
  }
  return lines.join('\n');
}

function findWardByNewName(q: string): Ward | undefined {
  const ql = stripDiacritics(q);
  // Prefer longest exact-name match contained in question
  const matches = wards
    .filter((w) => ql.includes(stripDiacritics(w.name)))
    .sort((a, b) => b.name.length - a.name.length);
  return matches[0];
}

function findWardsByOldName(q: string): { ward: Ward; oldName: string }[] {
  const ql = stripDiacritics(q);
  const results: { ward: Ward; oldName: string }[] = [];
  for (const w of wards) {
    for (const oldName of w.mergedFrom) {
      const clean = oldName.replace(/\s*\([^)]*\)/g, '').trim();
      if (!clean) continue;
      const cleanNorm = stripDiacritics(clean);
      // Match on full word ("xã hồng phong" or just "hồng phong")
      if (ql.includes(cleanNorm) && cleanNorm.length >= 3) {
        results.push({ ward: w, oldName: clean });
      }
    }
  }
  return results;
}

function findByLandmarkOrSpecialty(
  q: string
): { ward: Ward; type: 'landmark' | 'specialty'; text: string }[] {
  const ql = stripDiacritics(q);
  const out: { ward: Ward; type: 'landmark' | 'specialty'; text: string }[] = [];
  // Extract candidate noun phrases by removing common question words
  const cleaned = ql
    .replace(/\b(thuoc|phuong|xa|nao|o dau|gio|hien nay|la|gi|co|nao|tim|cho|toi|biet|ve|nay)\b/g, ' ')
    .replace(/[?.!,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return out;
  for (const w of wards) {
    for (const l of w.landmarks) {
      const name = l.text.split('--')[0].trim();
      const norm = stripDiacritics(name);
      if (norm.length >= 3 && cleaned.includes(norm)) {
        out.push({ ward: w, type: 'landmark', text: l.text });
      }
    }
    for (const s of w.specialties) {
      const name = s.text.split('--')[0].trim();
      const norm = stripDiacritics(name);
      if (norm.length >= 3 && cleaned.includes(norm)) {
        out.push({ ward: w, type: 'specialty', text: s.text });
      }
    }
  }
  return out;
}

// Answer chatbot questions based on ward data ONLY - NO hallucination
export function answerQuestion(question: string): string {
  const q = question.trim();
  if (!q) return NO_DATA_MSG;

  const ql = stripDiacritics(q);

  // 0. Greetings
  if (/^(chao|hi|hello|xin chao)\b/.test(ql)) {
    return 'Chào bạn, tôi là trợ lý bản đồ Hải Phòng. Tôi có thể giúp bạn tra cứu thông tin về 114 phường xã mới sau sáp nhập.';
  }

  // 1. Reverse lookup intent (old → new)
  const reverseIntent =
    /\b(gio o dau|hien nay|truoc day|sap nhap vao|thuoc phuong|thuoc xa|thuoc don vi)\b/.test(ql) ||
    /^xa\s+/.test(ql);
  if (reverseIntent) {
    const old = findWardsByOldName(q);
    if (old.length) {
      const uniq = Array.from(new Map(old.map((o) => [o.ward.name + '|' + o.oldName, o])).values());
      if (uniq.length === 1) {
        return `**${uniq[0].oldName}** hiện nay đã sáp nhập vào **${uniq[0].ward.name}**.`;
      }
      const lines = uniq.map((o) => `- **${o.oldName}** → **${o.ward.name}**`);
      return `Kết quả tra cứu sáp nhập:\n${lines.join('\n')}`;
    }
  }

  // 2. New ward lookup → full structured summary
  const targetWard = findWardByNewName(q);
  if (targetWard) {
    // Specific sub-questions
    if (/(dac san|mon an|am thuc|an gi)/.test(ql)) {
      if (!targetWard.specialties.length) return NO_DATA_MSG;
      return (
        `**Đặc sản của ${targetWard.name}:**\n` +
        targetWard.specialties.map((s) => `- ${s.text}`).join('\n')
      );
    }
    if (/(diem den|dia diem|danh lam|di tich|tham quan|du lich|choi gi|xem gi)/.test(ql)) {
      if (!targetWard.landmarks.length) return NO_DATA_MSG;
      return (
        `**Điểm đến tại ${targetWard.name}:**\n` +
        targetWard.landmarks.map((l) => `- ${l.text}`).join('\n')
      );
    }
    if (/(sap nhap|nguon goc|gop tu|truoc day)/.test(ql)) {
      if (!targetWard.mergedFrom.length) return NO_DATA_MSG;
      return (
        `**${targetWard.name} được sáp nhập từ:**\n` +
        targetWard.mergedFrom.map((m) => `- ${m}`).join('\n')
      );
    }
    if (/(dan so|bao nhieu nguoi|so dan)/.test(ql)) {
      return `**Dân số ${targetWard.name}:** ${targetWard.population} người`;
    }
    if (/(dien tich|rong|km)/.test(ql)) {
      return `**Diện tích ${targetWard.name}:** ${targetWard.area}`;
    }
    return formatWardSummary(targetWard);
  }

  // 3. Reverse lookup fallback (no explicit intent keyword)
  const oldHits = findWardsByOldName(q);
  if (oldHits.length) {
    const uniq = Array.from(new Map(oldHits.map((o) => [o.ward.name + '|' + o.oldName, o])).values());
    if (uniq.length === 1) {
      return `**${uniq[0].oldName}** hiện nay đã sáp nhập vào **${uniq[0].ward.name}**.`;
    }
    const lines = uniq.map((o) => `- **${o.oldName}** → **${o.ward.name}**`);
    return `Kết quả tra cứu sáp nhập:\n${lines.join('\n')}`;
  }

  // 4. Landmark / specialty search across all wards
  const lsHits = findByLandmarkOrSpecialty(q);
  if (lsHits.length) {
    // Deduplicate
    const uniq = Array.from(new Map(lsHits.map((h) => [h.ward.name + '|' + h.text, h])).values()).slice(0, 8);
    const lines = uniq.map((h) => {
      const label = h.type === 'landmark' ? 'Điểm đến' : 'Đặc sản';
      return `- **${label}** thuộc **${h.ward.name}**: ${h.text}`;
    });
    return `Kết quả tìm thấy trong dữ liệu sáp nhập:\n${lines.join('\n')}`;
  }

  return NO_DATA_MSG;
}
