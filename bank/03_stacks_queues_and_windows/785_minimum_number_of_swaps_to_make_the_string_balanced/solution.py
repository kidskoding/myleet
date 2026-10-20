def min_swaps(s: str) -> int:
    open_count = unmatched = 0
    for ch in s:
        if ch == "[":
            open_count += 1
        elif open_count:
            open_count -= 1
        else:
            unmatched += 1
    return (unmatched + 1) // 2
