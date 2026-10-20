from collections import Counter


def group_strings(words: list[str]) -> list[int]:
    counts: Counter[int] = Counter()
    for word in words:
        mask = 0
        for ch in word:
            mask |= 1 << (ord(ch) - ord("a"))
        counts[mask] += 1

    parent = {mask: mask for mask in counts}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    deleted_owner: dict[int, int] = {}
    for mask in counts:
        for bit in range(26):
            if mask >> bit & 1:
                sub = mask ^ (1 << bit)
                if sub in parent:
                    union(mask, sub)
                if sub in deleted_owner:
                    union(mask, deleted_owner[sub])
                else:
                    deleted_owner[sub] = mask

    sizes: Counter[int] = Counter()
    for mask, count in counts.items():
        sizes[find(mask)] += count
    return [len(sizes), max(sizes.values())]
