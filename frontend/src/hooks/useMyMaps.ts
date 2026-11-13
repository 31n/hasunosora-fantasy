import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  fetchMyMap,
  jstDateOf,
  loadMyMapCheckins,
  loadMyMapEntries,
  myMapBounds,
  myMapPlaceKey,
  saveMyMapCheckins,
  saveMyMapEntries,
  type MyMapCheckin,
  type MyMapData,
  type MyMapEntry,
} from '../utils/myMaps';
import { jstToday } from '../utils/date';

// 地図の上で選んだ、マイマップの場所
export interface MyMapPlace {
  name: string;
  description: string;
  mapName: string;
  // マイマップのレイヤー名（ジャンルとして出す）。なければ空
  layer: string;
  longitude: number;
  latitude: number;
  mid: string;
  // 地図の上でこの図形を見分けるための番号（強調表示に使う）
  fid: string;
  // ピン（点）のときだけ入る。線や面はチェックインの対象にしない
  placeKey: string | null;
}

// チェックイン済みの印を出すか（フィルター画面の設定に合わせる）
export interface MyMapMarks {
  today: boolean;
  all: boolean;
}

// 色と大きさは、スポットのピン（直径 30px、選択中はオレンジで大きめ）にそろえる
const TODAY_COLOR = '#16a34a';
const TODAY_BORDER = '#15803d';
const PAST_COLOR = '#0ea5e9';
const PAST_BORDER = '#0284c7';
const SELECTED_COLOR = '#f97316';
const SELECTED_BORDER = '#ea580c';
const PIN_RADIUS = 12;
const PIN_STROKE = 3;
const NO_MATCH: mapboxgl.FilterSpecification = ['==', ['get', 'fid'], ''];

const sourceId = (mid: string) => `mymap-${mid}`;
const layerIds = (mid: string) =>
  ['fill', 'line', 'selectedLine', 'circle', 'label', 'checked', 'check', 'selected'].map((kind) => `mymap-${mid}-${kind}`);

// Google マイマップを地図に重ねる。登録（マイページで行う）の一覧は端末内にあり、中身は開くたびに Google から取り直す
// focusMid を渡すと、その地図が読み込めたときに全体が収まる位置へ移動する
export function useMyMaps(map: MutableRefObject<mapboxgl.Map | null>, focusMid: string | null, marks: MyMapMarks) {
  const [entries, setEntries] = useState<MyMapEntry[]>(loadMyMapEntries);
  const [data, setData] = useState<Record<string, MyMapData>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selected, setSelected] = useState<MyMapPlace | null>(null);
  const [checkins, setCheckins] = useState<MyMapCheckin[]>(loadMyMapCheckins);
  const requested = useRef(new Set<string>());
  const added = useRef(new Set<string>());
  const pendingFit = useRef<string | null>(focusMid);

  // 地図のスタイルが読み込まれてからでないとレイヤーを足せない
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const onLoad = () => setMapLoaded(true);
    if (m.loaded()) onLoad();
    else m.once('load', onLoad);
    return () => {
      m.off('load', onLoad);
      added.current.clear();
      setMapLoaded(false);
    };
  }, []);

  const load = useCallback(async (mid: string): Promise<MyMapData | null> => {
    requested.current.add(mid);
    try {
      const result = await fetchMyMap(mid);
      setData((d) => ({ ...d, [mid]: result }));
      // 元の地図の名前が変わっていたら、保存してある名前も合わせる
      setEntries((list) => {
        if (!list.some((e) => e.mid === mid && e.name !== result.name)) return list;
        const next = list.map((e) => (e.mid === mid ? { ...e, name: result.name } : e));
        saveMyMapEntries(next);
        return next;
      });
      return result;
    } catch (error) {
      console.error('マイマップの読み込みエラー:', error);
      return null;
    }
  }, []);

  // 表示する地図のうち、まだ取りに行っていないものを読み込む
  useEffect(() => {
    for (const entry of entries) {
      if (entry.visible && !requested.current.has(entry.mid)) load(entry.mid);
    }
  }, [entries, load]);

  const handleClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    const m = map.current;
    // スポットのピンなど、地図の上に載っている要素を押したときは出さない
    if (!m || e.originalEvent.target !== m.getCanvas()) return;
    const props = e.features?.[0]?.properties;
    if (!props) return;
    const feature = e.features?.[0];
    const point = feature?.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    setSelected({
      name: props.name || '（名前なし）',
      description: props.description || '',
      mapName: props.mapName || '',
      layer: props.layer || '',
      longitude: point ? point[0] : e.lngLat.lng,
      latitude: point ? point[1] : e.lngLat.lat,
      mid: props.mid || '',
      fid: props.fid || '',
      placeKey: props.placeKey || null,
    });
  }, []);

  // 登録と表示の状態を、地図のレイヤーに反映する
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    const wanted = new Set(entries.filter((e) => e.visible && data[e.mid]).map((e) => e.mid));

    for (const mid of Array.from(added.current)) {
      if (wanted.has(mid)) continue;
      for (const id of layerIds(mid)) {
        m.off('click', id, handleClick);
        if (m.getLayer(id)) m.removeLayer(id);
      }
      if (m.getSource(sourceId(mid))) m.removeSource(sourceId(mid));
      added.current.delete(mid);
    }

    for (const mid of wanted) {
      // どの地図の場所かを出せるように、地図の名前を各図形に持たせる
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: data[mid].geojson.features.map((f, index) => ({
          ...f,
          properties: {
            ...f.properties,
            mapName: data[mid].name,
            mid,
            fid: `${mid}#${index}`,
            placeKey: f.geometry.type === 'Point'
              ? myMapPlaceKey(mid, f.properties?.name ?? '', f.geometry.coordinates[0], f.geometry.coordinates[1])
              : null,
          },
        })),
      };
      const existing = m.getSource(sourceId(mid)) as mapboxgl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geojson);
      } else {
        const [fill, line, selectedLine, circle, label, checked, check, selectedPin] = layerIds(mid);
        m.addSource(sourceId(mid), { type: 'geojson', data: geojson });
        m.addLayer({
          id: fill, type: 'fill', source: sourceId(mid),
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 },
        });
        m.addLayer({
          id: line, type: 'line', source: sourceId(mid),
          filter: ['!=', ['geometry-type'], 'Point'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': 3 },
        });
        // 選んだ線・面の強調。対象は下の effect で入れる
        m.addLayer({
          id: selectedLine, type: 'line', source: sourceId(mid),
          filter: NO_MATCH,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': SELECTED_COLOR, 'line-width': 6 },
        });
        m.addLayer({
          id: circle, type: 'circle', source: sourceId(mid),
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': PIN_RADIUS,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': PIN_STROKE,
          },
        });
        m.addLayer({
          id: label, type: 'symbol', source: sourceId(mid),
          filter: ['==', ['geometry-type'], 'Point'],
          minzoom: 13,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 1.5],
            'text-max-width': 9,
            'text-optional': true,
          },
          paint: { 'text-color': '#374151', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        });
        // チェックイン済みの印。対象と色は下の effect で入れる
        m.addLayer({
          id: checked, type: 'circle', source: sourceId(mid),
          filter: NO_MATCH,
          paint: { 'circle-radius': PIN_RADIUS, 'circle-stroke-width': PIN_STROKE },
        });
        m.addLayer({
          id: check, type: 'symbol', source: sourceId(mid),
          filter: NO_MATCH,
          layout: { 'text-field': '✓', 'text-size': 16, 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: { 'text-color': '#ffffff' },
        });
        // 選んだピンの強調。対象は下の effect で入れる
        m.addLayer({
          id: selectedPin, type: 'circle', source: sourceId(mid),
          filter: NO_MATCH,
          paint: {
            'circle-color': SELECTED_COLOR,
            'circle-radius': 17,
            'circle-stroke-color': SELECTED_BORDER,
            'circle-stroke-width': 4,
          },
        });
        for (const id of [fill, line, circle, checked, selectedPin]) m.on('click', id, handleClick);
        added.current.add(mid);
      }

      if (pendingFit.current === mid) {
        pendingFit.current = null;
        const bounds = myMapBounds(geojson);
        if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
      }
    }
  }, [mapLoaded, entries, data, handleClick]);

  // チェックイン済みの場所に印を付ける。今日の分は緑、それより前は青（スポットの印と同じ色）
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;
    const today = jstToday();
    const todayKeys = new Set<string>();
    const pastKeys = new Set<string>();
    for (const c of checkins) {
      (jstDateOf(c.checked_in_at) === today ? todayKeys : pastKeys).add(c.placeKey);
    }
    const shownToday = marks.today ? Array.from(todayKeys) : [];
    const shownPast = marks.all ? Array.from(pastKeys).filter((k) => !shownToday.includes(k)) : [];
    const filter: mapboxgl.FilterSpecification =
      ['in', ['get', 'placeKey'], ['literal', [...shownToday, ...shownPast]]];
    for (const mid of added.current) {
      const [, , , , , checked, check] = layerIds(mid);
      if (!m.getLayer(checked)) continue;
      m.setFilter(checked, filter);
      m.setFilter(check, filter);
      const isToday: mapboxgl.ExpressionSpecification = ['in', ['get', 'placeKey'], ['literal', shownToday]];
      m.setPaintProperty(checked, 'circle-color', ['case', isToday, TODAY_COLOR, PAST_COLOR]);
      m.setPaintProperty(checked, 'circle-stroke-color', ['case', isToday, TODAY_BORDER, PAST_BORDER]);
    }
  }, [mapLoaded, entries, data, checkins, marks.today, marks.all]);

  // 選んでいる場所を強調する（スポットの選択中と同じオレンジ）
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;
    const match: mapboxgl.FilterSpecification = ['==', ['get', 'fid'], selected?.fid ?? ''];
    for (const mid of added.current) {
      const [, , selectedLine, , , , , selectedPin] = layerIds(mid);
      if (!m.getLayer(selectedPin)) continue;
      m.setFilter(selectedPin, ['all', ['==', ['geometry-type'], 'Point'], match]);
      m.setFilter(selectedLine, ['all', ['!=', ['geometry-type'], 'Point'], match]);
    }
  }, [mapLoaded, entries, data, selected]);

  // フィルター画面の凡例に出す、表示中の地図。色はその地図でいちばん多いピンの色
  const legend = useMemo(() => entries.filter((e) => e.visible && data[e.mid]).map((e) => {
    const counts = new Map<string, number>();
    for (const f of data[e.mid].geojson.features) {
      if (f.geometry.type !== 'Point') continue;
      const color = f.properties?.color as string;
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
    const color = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '#ea4335';
    return { mid: e.mid, name: data[e.mid].name, color };
  }), [entries, data]);

  const clearSelected = useCallback(() => setSelected(null), []);

  // 選んだ場所にチェックインする。保存できたら true
  const checkin = useCallback((place: MyMapPlace): boolean => {
    if (!place.placeKey) return false;
    const next: MyMapCheckin[] = [...loadMyMapCheckins(), {
      placeKey: place.placeKey,
      mid: place.mid,
      mapName: place.mapName,
      name: place.name,
      longitude: place.longitude,
      latitude: place.latitude,
      checked_in_at: new Date().toISOString(),
    }];
    if (!saveMyMapCheckins(next)) return false;
    setCheckins(next);
    return true;
  }, []);

  // 選んでいる場所の状態：today = 今日チェックイン済み、past = 前にチェックインしたことがある
  const selectedStatus: 'none' | 'today' | 'past' = (() => {
    if (!selected?.placeKey) return 'none';
    const mine = checkins.filter((c) => c.placeKey === selected.placeKey);
    if (mine.some((c) => jstDateOf(c.checked_in_at) === jstToday())) return 'today';
    return mine.length > 0 ? 'past' : 'none';
  })();

  return { selected, clearSelected, checkin, selectedStatus, legend };
}
