def compressed_string(word: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(word):
        ch = word[i]
        j = i
        while j < len(word) and word[j] == ch and j - i < 9:
            j += 1
        out.append(f"{j - i}{ch}")
        i = j
    return "".join(out)
