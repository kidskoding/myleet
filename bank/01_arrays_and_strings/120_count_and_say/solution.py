def count_and_say(n: int) -> str:
    term = "1"
    for _ in range(n - 1):
        parts: list[str] = []
        i = 0
        while i < len(term):
            j = i
            while j < len(term) and term[j] == term[i]:
                j += 1
            parts.append(f"{j - i}{term[i]}")
            i = j
        term = "".join(parts)
    return term
