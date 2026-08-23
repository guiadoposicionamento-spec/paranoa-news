export function PageHero({
  eyebrow,
  icone,
  titulo,
  subtitulo,
  children,
}: {
  eyebrow?: string;
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="surface-ink text-white">
      <div className="container-portal pt-12 pb-14 md:pt-16 md:pb-20">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/60">
            <span className="w-6 h-[3px] bg-brand-primary rounded-sm" />
            {icone}
            {eyebrow}
          </span>
        )}

        <h1 className="titulo-hero text-[2.25rem] md:text-[3.5rem] mt-4 max-w-3xl">{titulo}</h1>

        {subtitulo && (
          <p className="text-white/60 mt-4 max-w-xl text-base md:text-lg leading-relaxed">{subtitulo}</p>
        )}

        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
