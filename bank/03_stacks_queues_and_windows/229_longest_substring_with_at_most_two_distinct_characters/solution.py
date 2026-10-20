def length_of_longest_substring_two_distinct(s: str) -> int:
    counts: dict[str, int] = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        counts[ch] = counts.get(ch, 0) + 1
        while len(counts) > 2:
            gone = s[left]
            counts[gone] -= 1
            if counts[gone] == 0:
                del counts[gone]
            left += 1
        best = max(best, right - left + 1)
    return best
