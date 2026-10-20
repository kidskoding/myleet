def repeat_limited_string(s: str, repeat_limit: int) -> str:
    counts = [0] * 26
    for ch in s:
        counts[ord(ch) - ord("a")] += 1
    out: list[str] = []
    i = 25
    while i >= 0:
        if counts[i] == 0:
            i -= 1
            continue
        take = min(counts[i], repeat_limit)
        out.append(chr(ord("a") + i) * take)
        counts[i] -= take
        if counts[i] == 0:
            continue
        j = i - 1
        while j >= 0 and counts[j] == 0:
            j -= 1
        if j < 0:
            break
        out.append(chr(ord("a") + j))
        counts[j] -= 1
    return "".join(out)
