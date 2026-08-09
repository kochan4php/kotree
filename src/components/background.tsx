export default function Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-20 w-64 h-64 bg-[#e05a47]/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-[#c7a693]/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-[#504136]/40 rounded-full blur-3xl"></div>
    </div>
  );
}
