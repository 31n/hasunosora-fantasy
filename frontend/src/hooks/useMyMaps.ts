import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  extractMyMapId,
  fetchMyMap,
  loadMyMapEntries,
  myMapBounds,
  saveMyMapEntries,
  type MyMapData,
  type MyMapEntry,
} from '../utils/myMaps';

export type MyMapStatus = 'loading' | 'ready' | 'error';

const sourceId = (mid: string) => `mymap-${mid}`;
const layerIds = (mid: string) => ['fill', 'line', 'circle', 'label'].map((kind) => `mymap-${mid}-${kind}`);

// Google マイマップを地図に重ねる。登録の一覧は端末内に保存し、中身は開くたびに Google から取り直す
export function useMyMaps(map: MutableRefObject<mapboxgl.Map | null>) {
  const [entries, setEntries] = useState<MyMapEntry[]>(loadMyMapEntries);
  const [data, setData] = useState<Record<string, MyMapData>>({});
  const [status, setStatus] = useState<Record<string, MyMapStatus>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const requested = useRef(new Set<string>());
  const added = useRef(new Set<string>());
  const pendingFit = useRef<string | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => saveMyMapEntries(entries), [entries]);

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
    setStatus((s) => ({ ...s, [mid]: 'loading' }));
    try {
      const result = await fetchMyMap(mid);
      setData((d) => ({ ...d, [mid]: result }));
      setStatus((s) => ({ ...s, [mid]: 'ready' }));
      setEntries((list) => list.map((e) => (e.mid === mid ? { ...e, name: result.name } : e)));
      return result;
    } catch (error) {
      console.error('マイマップの読み込みエラー:', error);
      setStatus((s) => ({ ...s, [mid]: 'error' }));
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

    const content = document.createElement('div');
    content.style.cssText = 'max-width:240px;max-height:200px;overflow-y:auto;font-size:13px;color:#374151;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;margin-right:16px;';
    title.textContent = props.name || '（名前なし）';
    content.appendChild(title);
    if (props.description) {
      const body = document.createElement('div');
      body.style.cssText = 'margin-top:6px;white-space:pre-wrap;word-break:break-word;';
      body.textContent = props.description;
      content.appendChild(body);
    }

    popup.current?.remove();
    popup.current = new mapboxgl.Popup({ offset: 10 }).setLngLat(e.lngLat).setDOMContent(content).addTo(m);
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
      popup.current?.remove();
    }

    for (const mid of wanted) {
      const geojson = data[mid].geojson;
      const existing = m.getSource(sourceId(mid)) as mapboxgl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geojson);
      } else {
        const [fill, line, circle, label] = layerIds(mid);
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
        m.addLayer({
          id: circle, type: 'circle', source: sourceId(mid),
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
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
            'text-offset': [0, 0.9],
            'text-max-width': 9,
            'text-optional': true,
          },
          paint: { 'text-color': '#374151', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        });
        for (const id of [fill, line, circle]) m.on('click', id, handleClick);
        added.current.add(mid);
      }

      if (pendingFit.current === mid) {
        pendingFit.current = null;
        const bounds = myMapBounds(geojson);
        if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
      }
    }
  }, [mapLoaded, entries, data, handleClick]);

  // URL から地図を追加する。うまくいかなければ、画面に出す文言を返す
  const add = useCallback(async (input: string): Promise<string | null> => {
    const mid = extractMyMapId(input);
    if (!mid) return 'マイマップの URL を確認してください（「mid=」を含む URL が必要です）';
    if (entries.some((e) => e.mid === mid)) return 'この地図は追加済みです';
    const result = await load(mid);
    if (!result) {
      requested.current.delete(mid);
      return '読み込めませんでした。マイマップの共有が「リンクを知っている全員」になっているか確認してください';
    }
    pendingFit.current = mid;
    setEntries((list) => [...list, { mid, name: result.name, visible: true }]);
    return null;
  }, [entries, load]);

  const toggle = useCallback((mid: string) => {
    setEntries((list) => list.map((e) => (e.mid === mid ? { ...e, visible: !e.visible } : e)));
  }, []);

  const remove = useCallback((mid: string) => {
    requested.current.delete(mid);
    setEntries((list) => list.filter((e) => e.mid !== mid));
  }, []);

  const reload = useCallback((mid: string) => { load(mid); }, [load]);

  const focus = useCallback((mid: string) => {
    const bounds = data[mid] && myMapBounds(data[mid].geojson);
    if (bounds) map.current?.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
  }, [data]);

  return { entries, status, add, toggle, remove, reload, focus };
}
