interface AgentInfo {
  id: string;
  owner_id: string;
  name: string;
}

interface Props {
  agents: AgentInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
  editingPolicy: boolean;
}

export function AgentSelector({ agents, selectedId, onSelect, editingPolicy }: Props) {
  if (agents.length === 0) return null;

  return (
    <div className="flex gap-2 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      {agents.map((agent) => {
        const active = agent.id === selectedId;
        return (
          <button
            key={agent.id}
            onClick={() => {
              if (editingPolicy && !confirm("Discard unsaved policy changes?")) return;
              onSelect(agent.id);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              active
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-blue/40 hover:text-brand-blue"
            }`}
          >
            {agent.name}
            <span className={`block text-xs mt-0.5 ${active ? "text-blue-100" : "text-gray-400"}`}>
              {agent.id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
