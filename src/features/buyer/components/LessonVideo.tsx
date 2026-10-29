import { externalVideoEmbed } from '@/utils/externalVideo';

/**
 * Plays a lesson video: an uploaded file (signed URL) or an allow-listed
 * YouTube / Vimeo link in a sandboxed iframe. Unknown links render nothing.
 */
export function LessonVideo({ file, videoUrl, title, autoPlay }: {
  file?: { url: string } | null;
  videoUrl?: string | null;
  title: string;
  autoPlay?: boolean;
}) {
  const embed = externalVideoEmbed(videoUrl);
  if (embed) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={embed.embedUrl} title={title} className="w-full h-full border-0"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy"
        />
      </div>
    );
  }
  if (file?.url) return <video src={file.url} controls autoPlay={autoPlay} controlsList="nodownload" className="w-full rounded-lg bg-black aspect-video" />;
  return null;
}
