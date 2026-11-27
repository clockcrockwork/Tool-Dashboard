/** Stories of the sketch (widget and full screen): sample strokes. */
import type { Dashboard } from '../../app/store/store';
import { clearPad, setPen, strokeEnd, strokeMove, strokeStart } from '../../widgets/sketch/status';
import type { PenColor, PenWidth } from '../../widgets/sketch/sketch';

/** A few sample strokes (memory only, like real drawing). */
export function sampleStrokes(d: Dashboard, id: string): void {
  clearPad(d, id);
  const lines: [PenColor, PenWidth, string[]][] = [
    ['t', 1, ['40.0 60.0', '80.0 40.0', '120.0 70.0', '160.0 45.0']],
    ['a', 2, ['60.0 120.0', '110.0 140.0', '170.0 110.0']],
    ['b', 0, ['200.0 60.0', '230.0 100.0', '260.0 70.0']],
  ];
  for (const [c, w, pts] of lines) {
    setPen(d, id, { c, w });
    strokeStart(d, id, pts[0] ?? '0 0');
    for (const p of pts.slice(1)) strokeMove(d, id, p);
    strokeEnd(d, id);
  }
  setPen(d, id, { c: 't', w: 1 });
}

