def longest_diverse_string(a: int, b: int, c: int) -> str:
    remaining = {"a": a, "b": b, "c": c}
    out: list[str] = []
    while True:
        placed = False
        for ch in sorted(remaining, key=lambda x: -remaining[x]):
            if remaining[ch] == 0:
                break
            if len(out) >= 2 and out[-1] == out[-2] == ch:
                continue
            out.append(ch)
            remaining[ch] -= 1
            placed = True
            break
        if not placed:
            return "".join(out)
