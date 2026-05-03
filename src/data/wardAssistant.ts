import { Ward } from '@/types/ward';
import { wards } from './wardsData';

/* =========================================================================
 * Concise Knowledge-Based Assistant for Hai Phong wards
 * Returns DIRECT, SHORT answers based strictly on .md data.
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
  'la','co','cua','o','va','hay','thi','nao','gi','nhung','cho','toi','minh','ban',
  'phuong','xa','tran','don','vi','hanh','chinh','moi','cu','truoc','day','gio','hien',
  'nay','con','duoc','khong','de','vao','ra','ben','nho','thuoc','muon','biet','ve',
  'thong','tin','giup','noi','hoi','kham','pha','tham','quan','di','den','tu',
  'tai','sao','nhu','the','rat','cac','mot','hai','ba','sap','nhap',
  'sau','khi','bay','that','dau','do','kia','ay','ngon','an','uong','choi','xem',
  'leo','tim','muon','dau'
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

/* ---------- Ward lookups ---------- */
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

/* ---------- Topic scan: only entries containing ALL keywords ---------- */
interface Hit {
  ward: Ward;
  field: 'landmark' | 'specialty' | 'description';
  text: string;
}

function scanCorpus(kws: string[]): Hit[] {
  if (!kws.length) return [];
  const hits: Hit[] = [];
  const matchAll = (norm: string) => kws.every((k) => norm.includes(k));
  for (const w of wards) {
    for (const l of w.landmarks) {
      if (matchAll(strip(l.text))) hits.push({ ward: w, field: 'landmark', text: l.text });
    }
    for (const s of w.specialties) {
      if (matchAll(strip(s.text))) hits.push({ ward: w, field: 'specialty', text: s.text });
    }
    if (w.description && matchAll(strip(w.description))) {
      hits.push({ ward: w, field: 'description', text: w.description });
    }
  }
  return hits;
}

/* ---------- Detail summary (only on explicit request) ---------- */
function summarize(w: Ward): string {
  const parts: string[] = [];
  parts.push(`**${w.name}**`);
  if (w.mergedFrom.length) parts.push(`*Hình thành từ:* ${w.mergedFrom.join(', ')}.`);
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

/* ---------- Superlatives & comparison (kept, concise) ---------- */
function handleSuperlative(ql: string): string | null {
  if (/(dan so|dong dan|nhieu dan|it dan)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => parseNumber(b.population) - parseNumber(a.population));
    if (/it dan|it nhat|thap nhat/.test(ql)) {
      const w = sorted[sorted.length - 1];
      return `Đơn vị có **dân số thấp nhất**: **${w.name}** (~${w.population} người).`;
    }
    const w = sorted[0];
    return `Đơn vị có **dân số đông nhất**: **${w.name}** (~${w.population} người).`;
  }
  if (/(dien tich|rong nhat|lon nhat|nho nhat|be nhat)/.test(ql)) {
    const sorted = [...wards].sort((a, b) => parseArea(b.area) - parseArea(a.area));
    if (/nho nhat|be nhat|hep nhat/.test(ql)) {
      const w = sorted.filter((x) => parseArea(x.area) > 0).pop()!;
      return `Đơn vị có **diện tích nhỏ nhất**: **${w.name}** (${w.area}).`;
    }
    const w = sorted[0];
    return `Đơn vị có **diện tích lớn nhất**: **${w.name}** (${w.area}).`;
  }
  return null;
}

function handleComparison(q: string): string | null {
  const ql = strip(q);
  if (!/so sanh|hon|kem|giua|vs/.test(ql)) return null;
  const found = wards
    .map((w) => ({ w, idx: ql.indexOf(strip(w.name)) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => b.w.name.length - a.w.name.length);
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
  return [
    `**So sánh ${a.name} và ${b.name}:**`,
    `- Dân số: ${a.population} vs ${b.population}`,
    `- Diện tích: ${a.area} vs ${b.area}`,
  ].join('\n');
}

/* ---------- Field-specific (when ward + topic combined) ---------- */
function handleSpecificField(w: Ward, ql: string): string | null {
  if (/(dac san|mon an|am thuc|do an|thuc an)/.test(ql)) {
    if (!w.specialties.length) return NO_DATA;
    return `**Đặc sản của ${w.name}:**\n${w.specialties.map((s) => `- ${s.text}`).join('\n')}`;
  }
  if (/(diem den|dia diem|danh lam|di tich|tham quan|du lich|canh dep)/.test(ql)) {
    if (!w.landmarks.length) return NO_DATA;
    return `**Điểm đến tại ${w.name}:**\n${w.landmarks.map((l) => `- ${l.text}`).join('\n')}`;
  }
  if (/(sap nhap|nguon goc|gop tu|hop tu|von la|gom)/.test(ql)) {
    if (!w.mergedFrom.length) return NO_DATA;
    return `**${w.name}** được hình thành từ: ${w.mergedFrom.join(', ')}.`;
  }
  if (/(dan so|bao nhieu nguoi|so dan)/.test(ql)) {
    return `Dân số **${w.name}**: ~**${w.population}** người.`;
  }
  if (/(dien tich|km)/.test(ql)) {
    return `Diện tích **${w.name}**: **${w.area}**.`;
  }
  return null;
}

/* ---------- Main entry ---------- */
export interface AssistantContext {
  selectedWard: Ward | null;
}

const DETAIL_RE = /(thong tin chi tiet|chi tiet ve|gioi thieu ve|tat ca thong tin|toan bo thong tin)/;

export function smartAnswer(question: string, ctx: AssistantContext): string {
  const q = question.trim();
  if (!q) return NO_DATA;
  const ql = strip(q);

  if (/^(chao|hi|hello|xin chao|alo|hey)\b/.test(ql)) {
    return 'Chào bạn! Hỏi tôi về 114 phường/xã Hải Phòng sau sáp nhập 2025: đặc sản, điểm đến, tên cũ, dân số, diện tích.';
  }

  const sup = handleSuperlative(ql);
  if (sup) return sup;

  const cmp = handleComparison(q);
  if (cmp) return cmp;

  const oldHits = findWardsByOldName(q);
  let target = findWardByName(q);

  // Pronoun → use selected ward on map
  const pronoun = /\b(day|do|noi nay|cho nay|cho do|o day|o do)\b/.test(ql);
  if (!target && pronoun && ctx.selectedWard) target = ctx.selectedWard;

  // Reverse lookup (old commune → new ward) — DIRECT, short
  if (!target && oldHits.length) {
    const uniq = Array.from(
      new Map(oldHits.map((o) => [o.ward.name + '|' + o.oldName, o])).values()
    );
    if (uniq.length === 1) {
      const { ward: w, oldName } = uniq[0];
      const fieldAns = handleSpecificField(w, ql);
      const intro = `**${oldName}** hiện nay đã sáp nhập vào **${w.name}**.`;
      if (fieldAns) return `${intro}\n\n${fieldAns}`;
      if (DETAIL_RE.test(ql)) return `${intro}\n\n${summarize(w)}`;
      return intro;
    }
    return `Có nhiều kết quả khớp với tên cũ:\n${uniq.map((o) => `- **${o.oldName}** → **${o.ward.name}**`).join('\n')}`;
  }

  // Known target ward
  if (target) {
    const ans = handleSpecificField(target, ql);
    if (ans) return ans;
    if (DETAIL_RE.test(ql)) return summarize(target);
    return `**${target.name}** — Diện tích ${target.area}, dân số ${target.population} người. Hỏi cụ thể về *đặc sản*, *điểm đến*, *nguồn gốc sáp nhập*, hoặc gõ "thông tin chi tiết về ${target.name}".`;
  }

  // Free-text topic scan: only entries containing ALL keywords
  const kws = keywords(q);
  const hits = scanCorpus(kws);
  if (hits.length) {
    const ranked = [...hits].sort((a, b) => {
      const w = (f: Hit['field']) => (f === 'description' ? 0 : 1);
      return w(b.field) - w(a.field);
    });
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const h of ranked) {
      const key = h.ward.name + '|' + h.text;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- ${h.text} — **${h.ward.name}**`);
      if (lines.length >= 4) break;
    }
    const topic = q.replace(/\?+$/, '').trim();
    return `Liên quan đến "${topic}":\n${lines.join('\n')}`;
  }

  return NO_DATA;
}
