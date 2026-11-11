import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Avatar } from '@/components/comman/ui';

interface ChatAvatarProps {
  name:       string;
  image?:     string | null;
  size?:      number;
  online?:    boolean;
  verified?:  boolean;
  className?: string;
}

// WhatsApp/Instagram-style avatar: real photo if we have one, else the
// app's initials Avatar. A green presence dot mirrors the "online" pip both
// platforms show on a contact's avatar; a small blue check overlays it for
// admin-verified stores (mutually exclusive with the presence dot — a store
// doesn't have online/offline presence the way a person does).
export function ChatAvatar({ name, image, size = 40, online, verified, className }: ChatAvatarProps) {
  // A broken URL falls back to initials; a new URL gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!image && failedSrc !== image;
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {showImage ? (
        <img loading="lazy" decoding="async"
          src={image}
          alt=""
          aria-hidden
          onError={() => setFailedSrc(image ?? null)}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <Avatar name={name} size={size} />
      )}
      {online && (
        <span
          className="absolute rounded-full bg-[#31a24c] border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28, right: -1, bottom: -1 }}
        />
      )}
      {verified && !online && (
        <BadgeCheck
          className="absolute text-[#3b82f6] fill-white"
          style={{ width: size * 0.34, height: size * 0.34, right: -2, bottom: -2 }}
          strokeWidth={2.5}
        />
      )}
    </div>
  );
}
