import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";

const placeholderUrl = "/player-placeholder.svg";

export default function PlayerImage({ src, alt = "Player", className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setPlaceholderFailed(false);
  }, [src]);

  if (placeholderFailed) {
    return (
      <span className={`player-image-fallback ${className}`} aria-label={alt}>
        <CircleUserRound size={24} />
      </span>
    );
  }

  return (
    <img
      className={className}
      src={imageFailed || !src ? placeholderUrl : src}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(placeholderUrl)) {
          setPlaceholderFailed(true);
        } else {
          setImageFailed(true);
        }
      }}
    />
  );
}
