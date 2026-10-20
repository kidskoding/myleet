def max_product(words: list[str]) -> int:
    masks: dict[int, int] = {}
    for word in words:
        mask = 0
        for ch in word:
            mask |= 1 << (ord(ch) - ord("a"))
        masks[mask] = max(masks.get(mask, 0), len(word))
    best = 0
    items = list(masks.items())
    for i, (mask_a, len_a) in enumerate(items):
        for mask_b, len_b in items[i + 1 :]:
            if mask_a & mask_b == 0:
                best = max(best, len_a * len_b)
    return best
