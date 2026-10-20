def make_string_good(s: str) -> int:
    cnt = [0] * 26
    for ch in s:
        cnt[ord(ch) - ord("a")] += 1
    best = len(s)
    for t in range(1, max(cnt) + 1):
        f = [0] * 28
        for i in range(25, -1, -1):
            x = cnt[i]
            f[i] = f[i + 1] + (x - t if x >= t else min(x, t - x))
            if i < 25 and cnt[i + 1] < t:
                excess = x - t if x >= t else x
                f[i] = min(f[i], f[i + 2] + max(excess, t - cnt[i + 1]))
        best = min(best, f[0])
    return best
