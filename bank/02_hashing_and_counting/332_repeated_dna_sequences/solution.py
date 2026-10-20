def find_repeated_dna_sequences(s: str) -> list[str]:
    seen: set[str] = set()
    repeated: set[str] = set()
    for i in range(len(s) - 9):
        window = s[i : i + 10]
        if window in seen:
            repeated.add(window)
        else:
            seen.add(window)
    return list(repeated)
