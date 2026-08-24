import Icon from "@/components/ui/Icon";

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
  }
  if (str.startsWith("https://www.youtube.com/embed/")) {
    return str;
  }
  return null;
}

export default function VideoSection({
  videoUrl,
  title,
  subtitle,
}: {
  videoUrl: string | null | undefined;
  title?: string | null;
  subtitle?: string | null;
}) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  if (!embedUrl) return null;

  return (
    <section className="py-20 lg:py-24 bg-paper-tint relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] lg:w-[800px] h-[400px] bg-ocean-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-extrabold uppercase tracking-widest mb-3">
            <Icon name="video" className="w-3.5 h-3.5" /> Video Profil
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink tracking-tight">
            {title || "Lihat Aktivitas & Suasana Belajar Kami"}
          </h2>
          <p className="text-ink-soft text-sm sm:text-base mt-3 leading-relaxed">
            {subtitle || "Kenali lebih dekat metode pengajaran, fasilitas, dan keseruan belajar renang bersama pelatih profesional di Next Swimming School."}
          </p>
        </div>

        {/* Video Frame */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-950 aspect-video ring-1 ring-slate-900/10">
          <iframe
            src={embedUrl}
            title={title || "Next Swimming School Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
