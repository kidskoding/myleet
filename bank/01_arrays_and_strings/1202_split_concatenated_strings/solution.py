def split_looped_string(strs: list[str]) -> str:
    best_parts = [s[::-1] if s[::-1] > s else s for s in strs]
    ans = "".join(best_parts)
    for i, s in enumerate(best_parts):
        t = "".join(best_parts[i + 1 :]) + "".join(best_parts[:i])
        for j in range(len(s)):
            a, b = s[j:], s[:j]
            ans = max(ans, a + t + b, b[::-1] + t + a[::-1])
    return ans
