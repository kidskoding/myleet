def shortest_beautiful_substring(s: str, k: int) -> str:
    ones = [i for i, ch in enumerate(s) if ch == "1"]
    best = ""
    for i in range(len(ones) - k + 1):
        cand = s[ones[i] : ones[i + k - 1] + 1]
        if not best or (len(cand), cand) < (len(best), best):
            best = cand
    return best
