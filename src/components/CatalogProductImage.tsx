"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Props = {
  alt: string;
  /** Локальный путь (`/pic.jpg`) или полный HTTPS (Blob/CDN и т.д.). */
  src: string;
  fill?: boolean;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * next/image режет неизвестные remote-домены; Blob и прочие внешние URL показываем через <img>.
 */
export function CatalogProductImage(props: Props) {
  const { alt, fill, sizes, className = "object-cover", priority } = props;
  const [failed, setFailed] = useState(false);
  const raw = useMemo(() => {
    const initial = props.src.trim() || "/placeholder.svg";
    if (failed) return "/placeholder.svg";
    if (!/^https?:\/\//i.test(initial)) return initial;
    try {
      const parsed = new URL(initial);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
        return parsed.toString();
      }
      return initial;
    } catch {
      return initial;
    }
  }, [failed, props.src]);

  const isRemoteHttp = /^https?:\/\//i.test(raw);
  if (isRemoteHttp) {
    const imgClass = fill ? `absolute inset-0 h-full w-full ${className}` : className;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        src={raw}
        className={imgClass}
        loading={priority ? "eager" : "lazy"}
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      alt={alt}
      src={raw}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority ?? false}
      onError={() => setFailed(true)}
    />
  );
}
