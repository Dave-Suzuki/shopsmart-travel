import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { toHttps } from '../../utils/url';

interface ItemThumbnailProps {
  imageUrl?: string;
  /** The item's name, for the image's alt text and the "view photo" button. */
  name: string;
  /** Size and shape, e.g. "h-12 w-12 rounded-lg". */
  className: string;
  /** Size of the fallback icon. */
  iconClassName?: string;
  /** Called when the photo is tapped. Without it (or without a photo) nothing is clickable. */
  onOpen?: () => void;
  /** Extra classes for the <img> itself. */
  imageClassName?: string;
}

/**
 * A product photo, or a neutral tile when there is none or it fails to load (store images
 * often expire or refuse hot-linking).
 */
export function ItemThumbnail({
  imageUrl,
  name,
  className,
  iconClassName = 'h-6 w-6',
  onOpen,
  imageClassName = '',
}: ItemThumbnailProps) {
  // Remember which URL failed, so a new photo gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = toHttps(imageUrl);

  if (!src || src === failedUrl) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400`}
        aria-hidden="true"
      >
        <ShoppingBag className={iconClassName} />
      </div>
    );
  }

  const image = (
    <img
      src={src}
      alt={onOpen ? '' : name}
      loading="lazy"
      onError={() => setFailedUrl(src)}
      className={`h-full w-full object-cover ${imageClassName}`}
    />
  );

  if (!onOpen) {
    return <div className={`${className} shrink-0 overflow-hidden bg-gray-100`}>{image}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View photo of ${name}`}
      className={`${className} shrink-0 overflow-hidden bg-gray-100 transition-opacity duration-200 hover:opacity-80`}
    >
      {image}
    </button>
  );
}
