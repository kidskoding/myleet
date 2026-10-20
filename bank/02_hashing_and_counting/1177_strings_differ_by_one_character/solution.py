def differ_by_one(words: list[str]) -> bool:
    if not words:
        return False
    for j in range(len(words[0])):
        seen: set[str] = set()
        for word in words:
            masked = word[:j] + "*" + word[j + 1 :]
            if masked in seen:
                return True
            seen.add(masked)
    return False
