def longest_balanced(s: str) -> int:
    best = 0
    for start in range(len(s)):
        counts = [0] * 26
        distinct = 0
        top = 0
        for end in range(start, len(s)):
            idx = ord(s[end]) - ord("a")
            if counts[idx] == 0:
                distinct += 1
            counts[idx] += 1
            top = max(top, counts[idx])
            length = end - start + 1
            if top * distinct == length:
                best = max(best, length)
    return best
