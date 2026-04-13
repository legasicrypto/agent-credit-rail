export function HeroBanner() {
  return (
    <section className="text-center py-12 px-4 animate-fade-in">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
        Corporate Credit Cards for AI Agents
      </h1>
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-lg text-gray-500">by</span>
        <a href="https://legasi.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
          <img src="/legasi-logo.svg" alt="Legasi" className="h-6" />
        </a>
      </div>
      <p className="text-gray-500 max-w-xl mx-auto mb-10">
        Post collateral. Set spending rules. Let your agents pay autonomously
        &mdash; every transaction settled on Stellar.
      </p>

      <div className="flex justify-center gap-6 md:gap-10">
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
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white flex items-center justify-center text-sm font-bold shadow-md">
        {number}
      </div>
      <span className="font-semibold text-sm text-gray-800">{title}</span>
      <span className="text-xs text-gray-500">{desc}</span>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center pt-0 self-start mt-4">
      <div className="w-8 md:w-12 h-px bg-gray-300" />
      <div className="text-gray-300 text-xs">&#9654;</div>
    </div>
  );
}
