def num_of_subsequences(s: str) -> int:
    total_t = s.count("T")
    l_count = lc = lct = 0
    t_after = total_t
    best_c = 0
    for ch in s:
        best_c = max(best_c, l_count * t_after)
        if ch == "L":
            l_count += 1
        elif ch == "C":
            lc += l_count
        elif ch == "T":
            lct += lc
            t_after -= 1
    best_c = max(best_c, l_count * t_after)
    t_count = ct = 0
    for ch in reversed(s):
        if ch == "T":
            t_count += 1
        elif ch == "C":
            ct += t_count
    return lct + max(ct, lc, best_c)
