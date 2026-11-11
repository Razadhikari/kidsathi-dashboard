"use client";

import { useEffect, useState } from "react";
import { imageObjectUrl } from "@/lib/photos";

/** Shows a protected photo (fetched with the login token). */
export default function SecureImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    imageObjectUrl(src)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [src]);

  if (failed) {
    return <div className={`${className ?? ""} grid place-items-center bg-[#F3EEE5] text-sm text-gray-500`}>Can’t load</div>;
  }
  if (!url) return <div className={`${className ?? ""} animate-pulse bg-[#F3EEE5]`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
