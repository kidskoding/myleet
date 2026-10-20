def has_all_codes(s: str, k: int) -> bool:
    need = 1 << k
    if len(s) - k + 1 < need:
        return False
    mask = need - 1
    seen = [False] * need
    found = 0
    value = 0
    for i, ch in enumerate(s):
        value = ((value << 1) | (ch == "1")) & mask
        if i >= k - 1 and not seen[value]:
            seen[value] = True
            found += 1
            if found == need:
                return True
    return False
