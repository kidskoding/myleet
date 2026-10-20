def max_length(arr: list[str]) -> int:
    masks = []
    for word in arr:
        mask = 0
        for ch in word:
            mask |= 1 << (ord(ch) - ord("a"))
        if mask.bit_count() == len(word):
            masks.append(mask)
    reachable = [0]
    for mask in masks:
        reachable += [m | mask for m in reachable if m & mask == 0]
    return max(m.bit_count() for m in reachable)
