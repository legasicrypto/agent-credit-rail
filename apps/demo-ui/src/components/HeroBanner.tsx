export function HeroBanner() {
  return (
    <section className="relative text-center py-16 px-4 animate-fade-in overflow-hidden">
      {/* Liquid glass background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[10%] w-72 h-72 rounded-full bg-brand-blue/8 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-56 h-56 rounded-full bg-brand-purple/6 blur-[60px]" />
        <div className="absolute top-[30%] right-[30%] w-40 h-40 rounded-full bg-gray-200/40 blur-[50px]" />
      </div>

      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
        Corporate Credit Cards
        <br />
        <span className="bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
          for AI Agents
        </span>
      </h1>

      <div className="flex items-center justify-center gap-2.5 mb-8">
        <span className="text-base text-gray-400 font-medium">by</span>
        <a href="https://legasi.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
          <img src="/legasi-logo.svg" alt="Legasi" className="h-5 opacity-80 hover:opacity-100 transition-opacity" />
        </a>
      </div>

      <p className="text-gray-400 max-w-lg mx-auto mb-12 text-sm leading-relaxed">
        Post collateral. Set spending rules. Let your agents pay autonomously
        &mdash; every transaction settled on Stellar.
      </p>

      {/* Glass card for steps */}
      <div className="inline-flex items-center gap-4 md:gap-6 px-8 py-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm">
        <Step number="1" title="Lock Collateral" desc="Owner posts XLM" />
        <Connector />
        <Step number="2" title="Set Policy" desc="Define spending rules" />
        <Connector />
        <Step number="3" title="Agents Spend" desc="Settled on Stellar" />
      </div>
    </section>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white flex items-center justify-center text-xs font-bold shadow-sm">
        {number}
      </div>
      <span className="font-semibold text-xs text-gray-700">{title}</span>
      <span className="text-[11px] text-gray-400">{desc}</span>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center self-start mt-3.5">
      <div className="w-6 md:w-10 h-px bg-gray-200" />
      <div className="text-gray-300 text-[10px]">&#9654;</div>
    </div>
  );
}
