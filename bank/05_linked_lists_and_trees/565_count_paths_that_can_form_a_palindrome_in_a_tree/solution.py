from collections import Counter


def count_palindrome_paths(parent: list[int], s: str) -> int:
    n = len(parent)
    children: list[list[int]] = [[] for _ in range(n)]
    for node in range(1, n):
        children[parent[node]].append(node)
    mask = [0] * n
    order = [0]
    for node in order:
        for child in children[node]:
            mask[child] = mask[node] ^ (1 << (ord(s[child]) - ord("a")))
            order.append(child)
    seen: Counter[int] = Counter()
    total = 0
    for m in mask:
        total += seen[m]
        for bit in range(26):
            total += seen[m ^ (1 << bit)]
        seen[m] += 1
    return total
