// ساخت درخت از لیست تخت (بر اساس parentId). عمق نامحدود است.
export interface TreeNode<T> {
  item: T;
  depth: number;
  children: TreeNode<T>[];
}

export function buildTree<T extends { id: string; parentId: string | null }>(
  items: T[],
  compare: (a: T, b: T) => number = () => 0
): TreeNode<T>[] {
  const ids = new Set(items.map((i) => i.id));
  const byParent = new Map<string | null, T[]>();
  items.forEach((item) => {
    // والدی که وجود ندارد، ریشه حساب می‌شود
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    const list = byParent.get(key) || [];
    list.push(item);
    byParent.set(key, list);
  });

  const build = (parentKey: string | null, depth: number, guard: Set<string>): TreeNode<T>[] =>
    (byParent.get(parentKey) || [])
      .slice()
      .sort(compare)
      .filter((item) => !guard.has(item.id))
      .map((item) => {
        const nextGuard = new Set(guard);
        nextGuard.add(item.id);
        return { item, depth, children: build(item.id, depth + 1, nextGuard) };
      });

  return build(null, 0, new Set());
}

/** همه‌ی شناسه‌های زیردرخت یک گره (شامل خودش) */
export function subtreeIds<T>(node: TreeNode<T>, getId: (t: T) => string): string[] {
  return [getId(node.item), ...node.children.flatMap((c) => subtreeIds(c, getId))];
}

/** همه‌ی گره‌هایی که زیرمجموعه دارند */
export function expandableIds<T>(nodes: TreeNode<T>[], getId: (t: T) => string): string[] {
  const out: string[] = [];
  const walk = (list: TreeNode<T>[]) =>
    list.forEach((n) => {
      if (n.children.length) {
        out.push(getId(n.item));
        walk(n.children);
      }
    });
  walk(nodes);
  return out;
}

/** گزینه‌های انتخاب با تورفتگی، برای همه‌ی عمق‌ها. excludeId و زیردرخت آن حذف می‌شوند (جلوگیری از حلقه). */
export function flattenLabels<T extends { id: string; name: string; parentId: string | null; displayOrder: number }>(
  items: T[],
  excludeId?: string
): { id: string; label: string }[] {
  const excluded = new Set<string>();
  if (excludeId) {
    const collect = (id: string) => {
      excluded.add(id);
      items.filter((i) => i.parentId === id).forEach((c) => collect(c.id));
    };
    collect(excludeId);
  }
  const tree = buildTree(items.filter((i) => !excluded.has(i.id)), (a, b) => a.displayOrder - b.displayOrder);
  const out: { id: string; label: string }[] = [];
  const walk = (nodes: TreeNode<T>[]) =>
    nodes.forEach((n) => {
      const prefix = '\u00A0\u00A0'.repeat(n.depth) + (n.depth ? '↳ ' : '');
      out.push({ id: n.item.id, label: prefix + n.item.name });
      walk(n.children);
    });
  walk(tree);
  return out;
}
