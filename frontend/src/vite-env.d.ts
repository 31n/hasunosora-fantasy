/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_API_ENDPOINT?: string;
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
