def make_largest_special(s: str) -> str:
    parts: list[str] = []
    balance = 0
    start = 0
    for i, ch in enumerate(s):
        balance += 1 if ch == "1" else -1
        if balance == 0:
            parts.append("1" + make_largest_special(s[start + 1 : i]) + "0")
            start = i + 1
    parts.sort(reverse=True)
    return "".join(parts)
