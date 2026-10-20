def is_substring_present(s: str) -> bool:
    pairs = {s[i : i + 2] for i in range(len(s) - 1)}
    return any(pair[::-1] in pairs for pair in pairs)
