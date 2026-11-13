// Google マイマップを端末内だけで読み込むための処理。
// KML はブラウザから Google に直接取りに行き、アプリのサーバーは通さない。
// 登録した地図の一覧は、この端末の localStorage にだけ保存する。

export interface MyMapEntry {
  mid: string;
  name: string;
  visible: boolean;
  // 表示フィルターで隠しているレイヤーの名前
  hiddenLayers?: string[];
}

export interface MyMapData {
  name: string;
  geojson: GeoJSON.FeatureCollection;
}

// マイマップの場所でのチェックイン。サーバーには送らず、この端末にだけ残す
export interface MyMapCheckin {
  placeKey: string;
  mid: string;
  mapName: string;
  name: string;
  longitude: number;
  latitude: number;
  checked_in_at: string;
}

const STORAGE_KEY = 'myMapsOverlays';
const CHECKINS_KEY = 'myMapsCheckins';
// チェックインできる距離（m）。スポットの検出半径の既定値と同じ
export const MYMAP_CHECKIN_RADIUS = 100;

// マイマップのピンには固定の ID がないので、地図・名前・位置で同じ場所とみなす
export function myMapPlaceKey(mid: string, name: string, longitude: number, latitude: number): string {
  return `${mid}|${name}|${longitude.toFixed(5)},${latitude.toFixed(5)}`;
}

export function loadMyMapCheckins(): MyMapCheckin[] {
  try {
    const raw = localStorage.getItem(CHECKINS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c && typeof c.placeKey === 'string' && typeof c.checked_in_at === 'string');
  } catch {
    return [];
  }
}

// 保存できたら true。容量不足などで保存できなかったら false
export function saveMyMapCheckins(checkins: MyMapCheckin[]): boolean {
  try {
    localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
    return true;
  } catch {
    return false;
  }
}

// 日時（ISO8601）を日本時間の日付（YYYY-MM-DD）にする
export function jstDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
const DEFAULT_COLOR = '#ea4335';

export function loadMyMapEntries(): MyMapEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && typeof e.mid === 'string' && isValidMid(e.mid))
      .map((e) => ({
        mid: e.mid,
        name: String(e.name ?? ''),
        visible: e.visible !== false,
        hiddenLayers: Array.isArray(e.hiddenLayers) ? e.hiddenLayers.filter((l: unknown) => typeof l === 'string') : [],
      }));
  } catch {
    return [];
  }
}

export function saveMyMapEntries(entries: MyMapEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* 保存できなくても表示は続ける */
  }
}

function isValidMid(mid: string): boolean {
  return /^[A-Za-z0-9_-]{10,100}$/.test(mid);
}

// マイマップの URL（viewer / edit / embed など）か、ID そのものから地図の ID を取り出す
export function extractMyMapId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (isValidMid(text)) return text;
  try {
    const url = new URL(text);
    if (!/(^|\.)google\.[a-z.]+$/.test(url.hostname)) return null;
    const mid = url.searchParams.get('mid');
    return mid && isValidMid(mid) ? mid : null;
  } catch {
    return null;
  }
}

export async function fetchMyMap(mid: string): Promise<MyMapData> {
  if (!isValidMid(mid)) throw new Error('invalid mid');
  const res = await fetch(
    `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`,
    { credentials: 'omit' }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseKml(await res.text());
}

function childText(el: Element, tag: string): string {
  for (const child of Array.from(el.children)) {
    if (child.localName === tag) return (child.textContent ?? '').trim();
  }
  return '';
}

// KML の色は aabbggrr。CSS の #rrggbb に直す
function kmlColor(value: string | undefined): string | null {
  if (!value || !/^[0-9a-fA-F]{8}$/.test(value)) return null;
  return `#${value.slice(6, 8)}${value.slice(4, 6)}${value.slice(2, 4)}`.toLowerCase();
}

function parseCoords(text: string): [number, number][] {
  const coords: [number, number][] = [];
  for (const token of text.trim().split(/\s+/)) {
    const [lng, lat] = token.split(',').map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat]);
  }
  return coords;
}

// 説明欄は HTML なので、そのまま画面に入れずに文字だけを取り出す
function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return (doc.body.textContent ?? '').trim();
}

interface KmlStyle {
  icon?: string;
  line?: string;
  poly?: string;
}

export function parseKml(text: string): MyMapData {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0 || doc.documentElement.localName !== 'kml') {
    throw new Error('not kml');
  }

  const styles = new Map<string, KmlStyle>();
  for (const style of Array.from(doc.getElementsByTagName('Style'))) {
    const id = style.getAttribute('id');
    if (!id) continue;
    const color = (parent: string) => {
      const el = style.getElementsByTagName(parent)[0];
      return el ? kmlColor(childText(el, 'color')) ?? undefined : undefined;
    };
    styles.set(id, { icon: color('IconStyle'), line: color('LineStyle'), poly: color('PolyStyle') });
  }
  const styleMaps = new Map<string, string>();
  for (const styleMap of Array.from(doc.getElementsByTagName('StyleMap'))) {
    const id = styleMap.getAttribute('id');
    if (!id) continue;
    for (const pair of Array.from(styleMap.getElementsByTagName('Pair'))) {
      if (childText(pair, 'key') === 'normal') styleMaps.set(id, childText(pair, 'styleUrl').replace(/^#/, ''));
    }
  }
  const resolveStyle = (styleUrl: string): KmlStyle => {
    const id = styleUrl.replace(/^#/, '');
    return styles.get(styleMaps.get(id) ?? id) ?? {};
  };

  const features: GeoJSON.Feature[] = [];
  for (const placemark of Array.from(doc.getElementsByTagName('Placemark'))) {
    const style = resolveStyle(childText(placemark, 'styleUrl'));
    // マイマップの「レイヤー」は、KML ではピンを入れた Folder になる。その名前をジャンルとして使う
    const folder = placemark.parentElement?.localName === 'Folder' ? placemark.parentElement : null;
    const base = {
      name: childText(placemark, 'name'),
      layer: folder ? childText(folder, 'name') : '',
      description: htmlToText(childText(placemark, 'description')),
    };
    const push = (geometry: GeoJSON.Geometry, color: string | undefined) => {
      features.push({ type: 'Feature', geometry, properties: { ...base, color: color ?? DEFAULT_COLOR } });
    };

    for (const point of Array.from(placemark.getElementsByTagName('Point'))) {
      const [coord] = parseCoords(childText(point, 'coordinates'));
      if (coord) push({ type: 'Point', coordinates: coord }, style.icon);
    }
    for (const line of Array.from(placemark.getElementsByTagName('LineString'))) {
      const coords = parseCoords(childText(line, 'coordinates'));
      if (coords.length >= 2) push({ type: 'LineString', coordinates: coords }, style.line);
    }
    for (const polygon of Array.from(placemark.getElementsByTagName('Polygon'))) {
      const rings: [number, number][][] = [];
      for (const boundary of ['outerBoundaryIs', 'innerBoundaryIs']) {
        for (const el of Array.from(polygon.getElementsByTagName(boundary))) {
          const coordsEl = el.getElementsByTagName('coordinates')[0];
          const ring = coordsEl ? parseCoords(coordsEl.textContent ?? '') : [];
          if (ring.length >= 4) rings.push(ring);
        }
      }
      if (rings.length > 0) push({ type: 'Polygon', coordinates: rings }, style.poly ?? style.line);
    }
  }

  const documentEl = doc.getElementsByTagName('Document')[0];
  return {
    name: (documentEl && childText(documentEl, 'name')) || 'マイマップ',
    geojson: { type: 'FeatureCollection', features },
  };
}

// 地図全体が収まる範囲 [[西, 南], [東, 北]]。図形がなければ null
export function myMapBounds(geojson: GeoJSON.FeatureCollection): [[number, number], [number, number]] | null {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const visit = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as number[];
      west = Math.min(west, lng); east = Math.max(east, lng);
      south = Math.min(south, lat); north = Math.max(north, lat);
    } else {
      coords.forEach(visit);
    }
  };
  for (const feature of geojson.features) {
    if (feature.geometry && 'coordinates' in feature.geometry) visit(feature.geometry.coordinates);
  }
  return Number.isFinite(west) ? [[west, south], [east, north]] : null;
}

// レイヤーの色が似ていて見分けにくい地図に使う色。スポットや、チェックイン済み・選択中の色とは別のものにする
const LAYER_PALETTE = ['#e11d48', '#7c3aed', '#92400e', '#4338ca', '#db2777', '#4d7c0f', '#0e7490', '#475569', '#a21caf', '#1e3a8a', '#b91c1c', '#065f46'];

function colorDistance(a: string, b: string): number {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

// レイヤーごとの色を決める。元の地図の色（そのレイヤーでいちばん多い色）で見分けられるならそれを使い、
// 似た色のレイヤーがあるとき（元の地図がアイコンの形で区別している場合など）は、こちらで色を割り当てる。
// overridden が true なら、ピンの色もこの色に置き換える
export function myMapLayerColors(geojson: GeoJSON.FeatureCollection): { colors: Map<string, string>; overridden: boolean } {
  const counts = new Map<string, Map<string, number>>();
  for (const f of geojson.features) {
    const layer = (f.properties?.layer as string) ?? '';
    const color = (f.properties?.color as string) ?? DEFAULT_COLOR;
    const byColor = counts.get(layer) ?? new Map<string, number>();
    byColor.set(color, (byColor.get(color) ?? 0) + 1);
    counts.set(layer, byColor);
  }
  const colors = new Map<string, string>();
  for (const [layer, byColor] of counts) {
    colors.set(layer, Array.from(byColor.entries()).sort((a, b) => b[1] - a[1])[0][0]);
  }
  const list = Array.from(colors.values());
  const overridden = list.some((a, i) => list.slice(i + 1).some((b) => colorDistance(a, b) < 80));
  if (overridden) {
    Array.from(colors.keys()).forEach((layer, i) => colors.set(layer, LAYER_PALETTE[i % LAYER_PALETTE.length]));
  }
  return { colors, overridden };
}
