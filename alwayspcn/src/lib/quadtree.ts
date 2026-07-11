/**
 * A region quadtree for 2-D point spatial indexing.
 *
 * Points are inserted with their original array indices so callers can map
 * results back to source data without extra bookkeeping.  The tree is
 * build-once / query-many: there are no delete or update operations.
 */

/** Max entries per leaf node before subdivision. */
const CAPACITY = 8;
/** Depth cap guards against degenerate all-same-point inputs. */
const MAX_DEPTH = 20;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Entry {
  x: number;
  y: number;
  idx: number;
}

class QNode {
  private entries: Entry[] = [];
  private children: [QNode, QNode, QNode, QNode] | null = null;
  private readonly midX: number;
  private readonly midY: number;

  constructor(private readonly b: Bounds) {
    this.midX = (b.minX + b.maxX) * 0.5;
    this.midY = (b.minY + b.maxY) * 0.5;
  }

  insert(e: Entry, depth: number): void {
    if (this.children) {
      this.child(e.x, e.y).insert(e, depth + 1);
      return;
    }
    this.entries.push(e);
    if (this.entries.length > CAPACITY && depth < MAX_DEPTH) {
      this.subdivide(depth);
    }
  }

  private subdivide(depth: number): void {
    const { minX, minY, maxX, maxY } = this.b;
    const mx = this.midX;
    const my = this.midY;
    this.children = [
      new QNode({ minX, minY, maxX: mx, maxY: my }),   // SW
      new QNode({ minX: mx, minY, maxX, maxY: my }),    // SE
      new QNode({ minX, minY: my, maxX: mx, maxY }),    // NW
      new QNode({ minX: mx, minY: my, maxX, maxY }),    // NE
    ];
    for (const old of this.entries) {
      this.child(old.x, old.y).insert(old, depth + 1);
    }
    this.entries = [];
  }

  private child(x: number, y: number): QNode {
    return this.children![(y >= this.midY ? 2 : 0) + (x >= this.midX ? 1 : 0)];
  }

  queryBounds(q: Bounds, out: number[]): void {
    // Quick AABB rejection
    if (q.maxX < this.b.minX || q.minX > this.b.maxX ||
        q.maxY < this.b.minY || q.minY > this.b.maxY) return;
    if (this.children) {
      for (const c of this.children) c.queryBounds(q, out);
    } else {
      for (const e of this.entries) {
        if (e.x >= q.minX && e.x <= q.maxX && e.y >= q.minY && e.y <= q.maxY) {
          out.push(e.idx);
        }
      }
    }
  }
}

/**
 * Immutable 2-D point index backed by a region quadtree.
 *
 * @example
 * const qt = new Quadtree(coordArray);
 * const indices = qt.queryBounds(minX, minY, maxX, maxY);
 */
export class Quadtree {
  private readonly root: QNode;

  constructor(points: ReadonlyArray<[number, number]>) {
    if (points.length === 0) {
      // Degenerate tree — queryBounds always returns [].
      this.root = new QNode({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    // Small padding so boundary points fall strictly inside the root node.
    const px = (maxX - minX) * 0.01 + 1e-9;
    const py = (maxY - minY) * 0.01 + 1e-9;
    this.root = new QNode({
      minX: minX - px,
      minY: minY - py,
      maxX: maxX + px,
      maxY: maxY + py,
    });
    for (let i = 0; i < points.length; i++) {
      this.root.insert({ x: points[i][0], y: points[i][1], idx: i }, 0);
    }
  }

  /**
   * Returns the indices of every point whose coordinate lies within the
   * closed bounding box [minX, maxX] × [minY, maxY].
   */
  queryBounds(minX: number, minY: number, maxX: number, maxY: number): number[] {
    const out: number[] = [];
    this.root.queryBounds({ minX, minY, maxX, maxY }, out);
    return out;
  }
}
