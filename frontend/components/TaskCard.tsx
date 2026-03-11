"use client";

type Status = "locked" | "ready" | "done";

interface Props {
  icon: string;
  title: string;
  status: Status;
  summary?: string;
  onOpen: () => void;
}

export default function TaskCard({ icon, title, status, summary, onOpen }: Props) {
  const isLocked = status === "locked";
  const isDone = status === "done";

  return (
    <button
      onClick={isLocked ? undefined : onOpen}
      disabled={isLocked}
      className={`relative w-full rounded-xl border p-6 text-left transition-all ${
        isLocked
          ? "border-[#e2e8f0] bg-[#f8fafc] cursor-not-allowed opacity-60"
          : isDone
          ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 cursor-pointer"
          : "border-[#e2e8f0] bg-white hover:border-[#0ea5e9] hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className={`font-semibold text-sm mb-1 ${
        isLocked ? "text-[#94a3b8]" : isDone ? "text-emerald-700" : "text-[#0f172a]"
      }`}>
        {title}
      </h3>
      <div className="flex items-center gap-1.5 mt-3">
        {isLocked && (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span className="text-xs text-[#94a3b8]">Locked</span>
          </>
        )}
        {status === "ready" && (
          <>
            <div className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
            <span className="text-xs text-[#0ea5e9]">Ready</span>
          </>
        )}
        {isDone && (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-xs text-emerald-600">Done</span>
          </>
        )}
      </div>
      {isDone && summary && (
        <p className="font-mono text-[10px] text-[#64748b] mt-2 truncate">{summary}</p>
      )}
    </button>
  );
}
