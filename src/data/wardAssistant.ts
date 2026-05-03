import { Ward } from '@/types/ward';
import { wards } from './wardsData';

/* =========================================================================
 * Intelligent Knowledge-Based Assistant for Hai Phong wards
 * Pure data-driven NLU: no hardcoded if/else for individual wards.
 * ========================================================================= */

const NO_DATA =
  'Hiện tại dữ liệu chính thức về khu vực này chưa được cập nhật trong tài liệu sáp nhập. Bạn có thể kiểm tra trực tiếp trên bản đồ.';

function strip(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function tokens(s: string): string[] {
  return strip(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const STOP = new Set([
  'la','co','cua','o','va','hay','thi','nao','gi','nhung','nhung','cho','toi','minh','ban',
  'phuong','xa','thi','tran','don','vi','hanh','chinh','moi','cu','truoc','day','gio','hien',
  'nay','nay','con','duoc','khong','de','vao','ra','ben','nho','thuoc','muon','biet','ve',
  'thong','tin','giup','noi','hoi','kham','pha','tham','quan','an','uong','di','den','tu',
  'tai','sao','nhu','the','rat','cu','the','cac','mot','hai','ba','con','sap','nhap',
  'sau','khi','bay','gio','that','ra','dau','dau','do','nay','kia','ay'
]);

function keywords(q: string): string[] {
  return tokens(q).filter((t) => t.length >= 2 && !STOP.has(t));
}

function parseNumber(s: string): number {
  const m = s.replace(/[.,]/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
function parseArea(s: string): number {
  const m = s.replace(/,/g, '.').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

/* ---------- Index by name ---------- */
function findWardByName(q: string): Ward | undefined {
  const ql = ' ' + strip(q) + ' ';
  return wards
    .filter((w) => ql.includes(' ' + strip(w.name) + ' '))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

function findWardsByOldName(q: string): { ward: Ward; oldName: string }[] {
  const ql = ' ' + strip(q) + ' ';
  const out: { ward: Ward; oldName: string }[] = [];
  for (const w of wards) {
    for (const old of w.mergedFrom) {
      const clean = old.replace(/\s*\([^)]*\)/g, '').trim();
      if (clean.length < 3) continue;
      if (ql.includes(' ' + strip(clean) + ' ')) {
        out.push({ ward: w, oldName: clean });
      }
    }
  }
  return out;
}

/* ---------- Free-text scan across landmarks/specialties/description ---------- */
interface Hit {
  ward: Ward;
  field: 'landmark' | 'specialty' | 'description';
  text: string;
  score: number;
}

function scanCorpus(kws: string[]): Hit[] {
  if (!kws.length) return [];
  const hits: Hit[] = [];
  for (const w of wards) {
    for (const l of w.landmarks) {
      const norm = strip(l.text);
      const score = kws.reduce((a, k) => a + (norm.includes(k) ? 1 : 0), 0);
      if (score) hits.push({ ward: w, field: 'landmark', text: l.text, score });
    }
    for (const s of w.specialties) {
      const norm = strip(s.text);
      const score = kws.reduce((a, k) => a + (norm.includes(k) ? 1 : 0), 0);
      if (score) hits.push({ ward: w, field: 'specialty', text: s.text, score });
    }
    if (w.description) {
      const norm = strip(w.description);
      const score = kws.reduce((a, k) => a + (norm.includes(k) ? 1 : 0), 0);
      if (score) hits.push({ ward: w, field: 'description', text: w.description, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

/* ---------- Formatters ---------- */
function summarize(w: Ward): string {
  const parts: string[] = [];
  parts.push(`**${w.name}**`);
  if (w.mergedFrom.length)
    parts.push(`*Hình thành từ:* ${w.mergedFrom.join(', ')}.`);
  parts.push(`*Diện tích:* ${w.area} · *Dân số:* ${w.population} người.`);
  if (w.landmarks.length) {
    parts.push(`\n**Điểm đến nổi bật:**`);
    w.landmarks.slice(0, 5).forEach((l) => parts.push(`- ${l.text}`));
  }
  if (w.specialties.length) {
    parts.push(`\n**Đặc sản tiêu biểu:**`);
    w.specialties.slice(0, 5).forEach((s) => parts.push(`- ${s.text}`));
  }
  if (w.description) parts.push(`\n${w.description}`);
  return parts.join('\n');
}

/* ---------- Intent handlers ---------- */
function handleSuperlative(ql: string): string | null {
  // dân số
  if (/(dan so|dong dan|nhieu dan|it dan)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => parseNumber(b.population) - parseNumber(a.population));
    if (/it dan|it nhat|thap nhat/.test(ql)) {
      const w = sorted[sorted.length - 1];
      return `Đơn vị có **dân số thấp nhất** là **${w.name}** với khoảng **${w.population}** người.`;
    }
    const w = sorted[0];
    return `Đơn vị có **dân số đông nhất** là **${w.name}** với khoảng **${w.population}** người. Tiếp theo là ${sorted
      .slice(1, 4)
      .map((x) => `${x.name} (${x.population})`)
      .join(', ')}.`;
  }
  // diện tích
  if (/(dien tich|rong nhat|lon nhat|nho nhat|be nhat)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => parseArea(b.area) - parseArea(a.area));
    if (/nho nhat|be nhat|hep nhat/.test(ql)) {
      const w = sorted.filter((x) => parseArea(x.area) > 0).pop()!;
      return `Đơn vị có **diện tích nhỏ nhất** là **${w.name}** với **${w.area}**.`;
    }
    const w = sorted[0];
    return `Đơn vị có **diện tích lớn nhất** là **${w.name}** (${w.area}). Tiếp theo: ${sorted
      .slice(1, 4)
      .map((x) => `${x.name} (${x.area})`)
      .join(', ')}.`;
  }
  // nhiều đặc sản / điểm đến nhất
  if (/(nhieu dac san|nhieu mon|nhieu am thuc)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => b.specialties.length - a.specialties.length);
    const top = sorted.slice(0, 3);
    return `Các phường/xã có **nhiều đặc sản nhất**:\n${top
      .map((w, i) => `${i + 1}. **${w.name}** — ${w.specialties.length} đặc sản`)
      .join('\n')}`;
  }
  if (/(nhieu diem den|nhieu danh lam|nhieu di tich|nhieu cho choi)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => b.landmarks.length - a.landmarks.length);
    const top = sorted.slice(0, 3);
    return `Các phường/xã có **nhiều điểm đến nhất**:\n${top
      .map((w, i) => `${i + 1}. **${w.name}** — ${w.landmarks.length} địa điểm`)
      .join('\n')}`;
  }
  return null;
}

function handleComparison(q: string): string | null {
  const ql = strip(q);
  if (!/so sanh|hon|kem|giua|va|vs/.test(ql)) return null;
  // Find 2 ward names mentioned
  const found = wards
    .map((w) => ({ w, idx: ql.indexOf(strip(w.name)) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => b.w.name.length - a.w.name.length);
  // Dedup overlapping (keep longest first, exclude if name contained in already-picked range)
  const picked: Ward[] = [];
  const usedRanges: [number, number][] = [];
  for (const f of found) {
    const start = f.idx;
    const end = f.idx + strip(f.w.name).length;
    if (usedRanges.some(([s, e]) => start < e && end > s)) continue;
    picked.push(f.w);
    usedRanges.push([start, end]);
    if (picked.length >= 2) break;
  }
  if (picked.length < 2) return null;
  const [a, b] = picked;
  const aPop = parseNumber(a.population);
  const bPop = parseNumber(b.population);
  const aArea = parseArea(a.area);
  const bArea = parseArea(b.area);
  const lines: string[] = [];
  lines.push(`**So sánh ${a.name} và ${b.name}:**`);
  lines.push(`- Dân số: ${a.name} ${a.population} người · ${b.name} ${b.population} người ${
    aPop && bPop ? `→ ${aPop > bPop ? a.name : b.name} đông hơn (~${Math.abs(aPop - bPop).toLocaleString('vi-VN')} người)` : ''
  }`);
  lines.push(`- Diện tích: ${a.name} ${a.area} · ${b.name} ${b.area} ${
    aArea && bArea ? `→ ${aArea > bArea ? a.name : b.name} rộng hơn` : ''
  }`);
  lines.push(`- Điểm đến / Đặc sản: ${a.name} ${a.landmarks.length}/${a.specialties.length} · ${b.name} ${b.landmarks.length}/${b.specialties.length}`);
  return lines.join('\n');
}

function handleSpecificField(w: Ward, ql: string): string | null {
  if (/(dac san|mon an|am thuc|an gi|do an|thuc an)/.test(ql)) {
    if (!w.specialties.length) return NO_DATA;
    return `**Đặc sản của ${w.name}:**\n${w.specialties.map((s) => `- ${s.text}`).join('\n')}`;
  }
  if (/(diem den|dia diem|danh lam|di tich|tham quan|du lich|choi gi|xem gi|canh dep|noi)/.test(ql)) {
    if (!w.landmarks.length) return NO_DATA;
    return `**Điểm đến tại ${w.name}:**\n${w.landmarks.map((l) => `- ${l.text}`).join('\n')}`;
  }
  if (/(sap nhap|nguon goc|gop tu|hop tu|truoc day|von la|tu nhung|gom)/.test(ql)) {
    if (!w.mergedFrom.length) return NO_DATA;
    return `**${w.name}** được hình thành từ: ${w.mergedFrom.join(', ')}.`;
  }
  if (/(dan so|bao nhieu nguoi|so dan|nguoi dan)/.test(ql)) {
    return `**Dân số ${w.name}** khoảng **${w.population}** người.`;
  }
  if (/(dien tich|rong|km|bao nhieu km)/.test(ql)) {
    return `**Diện tích ${w.name}** là **${w.area}**.`;
  }
  if (/(mo ta|gioi thieu|noi gi ve|the nao|ra sao)/.test(ql)) {
    return w.description ? `**${w.name}** — ${w.description}` : summarize(w);
  }
  return null;
}

/* ---------- Main entry ---------- */
export interface AssistantContext {
  selectedWard: Ward | null;
}

export function smartAnswer(question: string, ctx: AssistantContext): string {
  const q = question.trim();
  if (!q) return NO_DATA;
  const ql = strip(q);

  // Greetings
  if (/^(chao|hi|hello|xin chao|alo|hey)\b/.test(ql)) {
    return 'Chào bạn! Tôi là trợ lý tra cứu hành chính Hải Phòng sau sáp nhập 2025. Bạn có thể hỏi về 114 phường/xã mới: lịch sử sáp nhập, đặc sản, điểm đến, dân số, diện tích, hoặc so sánh giữa các đơn vị.';
  }

  // 1. Superlatives
  const sup = handleSuperlative(ql);
  if (sup) return sup;

  // 2. Comparisons (need ≥2 wards in question)
  const cmp = handleComparison(q);
  if (cmp) return cmp;

  // 3. Reverse lookup (old name → new ward)
  const oldHits = findWardsByOldName(q);

  // 4. Find an explicit new ward name in the question
  let target = findWardByName(q);

  // 5. Context awareness: pronouns like "đây", "ở đó", "nơi này"
  const pronoun = /\b(day|do|noi nay|cho nay|cho do|chỗ nay|o day|o do)\b/.test(ql) ||
                  // OR question without any ward mention but ctx.selectedWard exists
                  (!target && oldHits.length === 0);
  if (!target && pronoun && ctx.selectedWard) {
    target = ctx.selectedWard;
  }

  // 6. If reverse-lookup found a unique old → new mapping, prefer connecting to that new ward
  if (!target && oldHits.length) {
    const uniq = Array.from(
      new Map(oldHits.map((o) => [o.ward.name + '|' + o.oldName, o])).values()
    );
    if (uniq.length === 1) {
      const w = uniq[0].ward;
      // If the user asked for more than just "where is X now", give a rich combined answer
      const fieldAns = handleSpecificField(w, ql);
      const intro = `**${uniq[0].oldName}** nay thuộc **${w.name}**.`;
      if (fieldAns) return `${intro}\n\n${fieldAns}`;
      // If question hints at "có gì hay / thế nào / giới thiệu"
      if (/(co gi|hay|the nao|ra sao|gioi thieu|kham pha|tham quan|an gi|choi gi)/.test(ql)) {
        return `${intro}\n\n${summarize(w)}`;
      }
      return intro;
    }
    const lines = uniq.map((o) => `- **${o.oldName}** → **${o.ward.name}**`);
    return `Có nhiều kết quả khớp với tên cũ bạn hỏi:\n${lines.join('\n')}`;
  }

  // 7. Specific field on a known target ward
  if (target) {
    const ans = handleSpecificField(target, ql);
    if (ans) return ans;
    return summarize(target);
  }

  // 8. Free-text scan across landmarks/specialties/description
  const kws = keywords(q);
  const hits = scanCorpus(kws);
  if (hits.length) {
    // Group by ward, show top 6 unique results
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const h of hits) {
      const key = h.ward.name + '|' + h.text;
      if (seen.has(key)) continue;
      seen.add(key);
      const tag =
        h.field === 'landmark' ? 'Điểm đến' : h.field === 'specialty' ? 'Đặc sản' : 'Mô tả';
      lines.push(`- *${tag}* — **${h.ward.name}**: ${h.text}`);
      if (lines.length >= 6) break;
    }
    return `Tôi tìm thấy ${hits.length} kết quả liên quan trong dữ liệu sáp nhập:\n${lines.join('\n')}`;
  }

  return NO_DATA;
}