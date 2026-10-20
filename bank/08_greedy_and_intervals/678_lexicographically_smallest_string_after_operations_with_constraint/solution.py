def get_smallest_string(s: str, k: int) -> str:
    out = list(s)
    for i, ch in enumerate(out):
        offset = ord(ch) - ord("a")
        cost = min(offset, 26 - offset)
        if cost <= k:
            out[i] = "a"
            k -= cost
        else:
            out[i] = chr(ord(ch) - k)
            break
    return "".join(out)
