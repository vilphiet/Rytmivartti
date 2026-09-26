export const PAGE_SIZE = 8;

export function pageCountFor(patternSteps: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(patternSteps / pageSize));
}

interface Props {
  patternSteps: number;
  pageSize?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  followPlayback: boolean;
  onFollowPlaybackChange: (follow: boolean) => void;
}

/** Page buttons (1-8 / 9-16 / …) replacing horizontal scroll, shared by
 * StepGrid and PianoRoll so paging can never disagree between the two. */
export function StepPager({ patternSteps, pageSize = PAGE_SIZE, currentPage, onPageChange, followPlayback, onFollowPlaybackChange }: Props) {
  const pageCount = pageCountFor(patternSteps, pageSize);
  if (pageCount <= 1) return null;

  return (
    <div className="seq-pager">
      <div className="seq-pager-pages">
        {Array.from({ length: pageCount }, (_, page) => {
          const start = page * pageSize + 1;
          const end = Math.min(patternSteps, (page + 1) * pageSize);
          return (
            <button
              key={page}
              type="button"
              className={`tab-bar-btn${page === currentPage ? ' active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {start}–{end}
            </button>
          );
        })}
      </div>
      <label className="seq-follow-toggle">
        <input type="checkbox" checked={followPlayback} onChange={(e) => onFollowPlaybackChange(e.target.checked)} />
        Seuraa soittoa
      </label>
    </div>
  );
}
