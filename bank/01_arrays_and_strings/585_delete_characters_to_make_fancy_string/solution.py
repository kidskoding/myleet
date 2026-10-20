def make_fancy_string(s: str) -> str:
    out: list[str] = []
    for ch in s:
        if len(out) >= 2 and out[-1] == ch and out[-2] == ch:
            continue
        out.append(ch)
    return "".join(out)
