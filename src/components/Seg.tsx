/**
 * Seg —— 分段胶囊：小规模互斥切换（星图视图 / 器物展陈模式）
 *
 * 细边框圆角轨道 + 淡朱砂滑块；滑块位置实测选中项的 offsetLeft/offsetWidth
 * （各项文案长短不一，等分宽会截字），200ms 滑动过渡。
 */
import { useLayoutEffect, useRef, useState } from 'react';

interface SegOption<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (k: T) => void;
}

export default function Seg<T extends string>({ options, value, onChange }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const i = options.findIndex((o) => o.key === value);
      const el = itemRefs.current[i];
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [options, value]);

  return (
    <div className="seg" ref={trackRef}>
      {thumb && (
        <span
          className="seg-thumb"
          aria-hidden="true"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((o, i) => (
        <button
          key={o.key}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={`seg-item${value === o.key ? ' active' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
