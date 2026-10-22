"use client";

import Image from "next/image";
import { getServiceIcon } from "@/components/services/service-icons";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ComponentType } from "react";

type ServiceVisualProps = {
  title: string;
  image?: string | null;
  icon?: string | null;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
};

type ServiceIconTileProps = {
  Icon: ComponentType<{ className?: string }>;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClassName = {
  sm: "h-10 w-10 rounded-lg",
  md: "h-14 w-14 rounded-xl",
  lg: "h-20 w-20 rounded-2xl",
  hero: "h-full w-full rounded-t-[inherit]",
};

const imageSizes = {
  sm: "40px",
  md: "56px",
  lg: "80px",
  hero: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
};

const nativeImageDimensions = {
  sm: { width: 40, height: 40 },
  md: { width: 56, height: 56 },
  lg: { width: 80, height: 80 },
  hero: { width: 640, height: 360 },
};

const iconTileClassName = {
  sm: "h-10 w-10 rounded-xl",
  md: "h-14 w-14 rounded-2xl",
  lg: "h-16 w-16 rounded-[1.15rem]",
};

const iconTileInnerClassName = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-10 w-10",
};

export function ServiceIconTile({ Icon, size = "md", className }: ServiceIconTileProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 p-0.5 shadow-[0_18px_40px_-18px_rgba(37,99,235,0.6)] ring-1 ring-white/20",
        iconTileClassName[size],
        className,
      )}
    >
      <div className="flex h-full w-full items-center justify-center rounded-[inherit] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))]">
        <Icon className={cn("text-white drop-shadow-sm", iconTileInnerClassName[size])} />
      </div>
    </div>
  );
}

export default function ServiceVisual({
  title,
  image,
  icon,
  size = "md",
  className,
}: ServiceVisualProps) {
  const Icon = getServiceIcon(icon ?? "");
  const cleanedImage = image?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);
  const useNativeImage = cleanedImage.startsWith("http://") || cleanedImage.startsWith("https://");

  useEffect(() => {
    setImageFailed(false);
  }, [cleanedImage]);

  if (cleanedImage && !imageFailed) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden bg-muted", sizeClassName[size], className)}>
        {/* Native image avoids next/image remote-pattern failures for sheet-driven URLs. */}
        {useNativeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cleanedImage}
            alt={title}
            width={nativeImageDimensions[size].width}
            height={nativeImageDimensions[size].height}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <Image
            src={cleanedImage}
            alt={title}
            fill
            sizes={imageSizes[size]}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
      </div>
    );
  }

  return <ServiceIconTile Icon={Icon} size={size === "hero" ? "lg" : size} className={className} />;
}
