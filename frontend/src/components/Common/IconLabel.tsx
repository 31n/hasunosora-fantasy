import type { ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

interface IconLabelProps {
  icon: SvgIconComponent;
  // アイコンの大きさ（px）。文字より 2px ほど大きくすると揃って見える
  size?: number;
  gap?: number;
  // 省略すると文字と同じ色
  color?: string;
  children: ReactNode;
}

/**
 * アイコン＋文字。ボタンや見出しの文言の前にアイコンを付けるときに使う
 */
export default function IconLabel({ icon: Icon, size = 18, gap = 6, color, children }: IconLabelProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: `${gap}px`, verticalAlign: 'middle' }}>
      <Icon style={{ fontSize: `${size}px`, color, flexShrink: 0 }} aria-hidden="true" />
      {children}
    </span>
  );
}
