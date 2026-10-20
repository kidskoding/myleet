def min_flips(s: str) -> int:
    n = len(s)
    doubled = s + s
    diff_a = diff_b = 0
    best = n
    for i, ch in enumerate(doubled):
        if ch != "01"[i % 2]:
            diff_a += 1
        if ch != "10"[i % 2]:
            diff_b += 1
        if i >= n:
            left = doubled[i - n]
            if left != "01"[(i - n) % 2]:
                diff_a -= 1
            if left != "10"[(i - n) % 2]:
                diff_b -= 1
        if i >= n - 1:
            best = min(best, diff_a, diff_b)
    return best
