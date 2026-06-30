import type { StageData } from '../types';

/**
 * Live multi-agent progress timeline for a Studio generation.
 *
 * The backend (architectures/studio/progress.py) emits one "stage" SSE event when
 * each agent starts and finishes. We render the full known roster so agents that
 * have not started yet show as pending, and overlay the live state by index. Keep
 * this roster in sync with progress.py STAGES (labels rarely change).
 */
const ROSTER: { index: number; agent: string; stage: string }[] = [
  { index: 1, agent: 'Requirements Analyst', stage: 'Reading the brief' },
  { index: 2, agent: 'Information Architect', stage: 'Planning routes + components' },
  { index: 3, agent: 'Design Director', stage: 'Locking the design system' },
  { index: 4, agent: 'Asset Curator', stage: 'Fetching images' },
  { index: 5, agent: 'Section Builders', stage: 'Building components' },
  { index: 6, agent: 'App Assembler', stage: 'Wiring routes + app shell' },
  { index: 7, agent: 'Build Engineer', stage: 'Installing + building' },
  { index: 8, agent: 'Static Reviewer', stage: 'Checking nav + imports' },
  { index: 9, agent: 'Rendered-DOM Auditor', stage: 'Measuring contrast + layout' },
  { index: 10, agent: 'Completeness Critic', stage: 'Verifying requested features' },
  { index: 11, agent: 'Fixer', stage: 'Repairing issues' },
];

type RowState = 'pending' | 'running' | 'done';

const StateIcon = ({ state }: { state: RowState }) => {
  if (state === 'done') {
    return (
      <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (state === 'running') {
    return (
      <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    );
  }
  return <span className="block h-2 w-2 rounded-full bg-border" aria-hidden />;
};

interface StageTimelineProps {
  stages: StageData[];
}

export const StageTimeline = ({ stages }: StageTimelineProps) => {
  if (!stages.length) return null;

  const byIndex = new Map(stages.map((s) => [s.index, s]));
  const total = stages[0]?.total ?? ROSTER.length;
  const doneCount = stages.filter((s) => s.state === 'done').length;
  const rows = ROSTER.filter((r) => r.index <= total);

  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Building your theme</span>
        {/* <span className="text-xs font-medium text-gray-400">{doneCount}/{total}</span> */}
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const live = byIndex.get(r.index);
          const state: RowState = (live?.state as RowState) ?? 'pending';
          const detail = live?.detail || r.stage;
          if(state !== 'pending')
          return (
            <li key={r.index} className="flex items-center gap-3">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <StateIcon state={state} />
              </span>
              <span className={/* state === 'pending' ? 'text-sm text-gray-500' : */ 'text-sm font-medium text-foreground'}>
                {r.agent}
              </span>
              <span className="truncate text-xs text-gray-500">{detail}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
