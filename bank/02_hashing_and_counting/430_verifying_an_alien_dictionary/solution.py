def is_alien_sorted(words: list[str], order: str) -> bool:
    # Time: O(total characters).
    # Space: O(1), the rank table has 26 entries.
    rank = {ch: i for i, ch in enumerate(order)}
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                if rank[x] > rank[y]:
                    return False
                break
        else:
            if len(a) > len(b):
                return False
    return True
