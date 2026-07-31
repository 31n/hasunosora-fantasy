/// <reference types="vite/client" />

// .md?raw インポートの型定義
declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.md' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_API_ENDPOINT?: string;
  /** 日本語ラベルのMapbox StudioスタイルID（例: username/style-id）省略時は mapbox/streets-v12 */
  readonly VITE_MAPBOX_STATIC_STYLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// DeviceOrientationEvent の拡張
interface DeviceOrientationEvent {
  readonly webkitCompassHeading?: number;
}

// DeviceOrientationEvent の静的メソッド
interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

declare var DeviceOrientationEvent: DeviceOrientationEventConstructor & {
  prototype: DeviceOrientationEvent;
  new(): DeviceOrientationEvent;
};
