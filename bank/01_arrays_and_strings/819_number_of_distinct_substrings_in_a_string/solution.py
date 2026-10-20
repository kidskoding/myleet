def count_distinct(s: str) -> int:
    root: dict[str, dict] = {}
    count = 0
    for start in range(len(s)):
        node = root
        for ch in s[start:]:
            if ch not in node:
                node[ch] = {}
                count += 1
            node = node[ch]
    return count
