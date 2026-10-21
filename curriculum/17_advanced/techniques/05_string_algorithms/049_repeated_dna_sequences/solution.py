def find_repeated_dna_sequences(s: str) -> list[str]:
    # Problem 49: Repeated DNA Sequences
    # Time: O(n)
    # Space: O(n)

    if len(s) < 10:
        return []
    seen: set[str] = set()
    repeated: set[str] = set()
    for i in range(len(s) - 9):
        sub = s[i : i + 10]
        if sub in seen:
            repeated.add(sub)
        else:
            seen.add(sub)
    return list(repeated)
