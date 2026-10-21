def distinct_echo_substrings(text: str) -> int:
    # Problem 50: Distinct Echo Substrings
    # Time: O(n^2)
    # Space: O(n^2) for the set of echoes in the worst case

    n = len(text)
    base = 911382323
    mod = 1_000_000_007
    pows = [1] * (n + 1)
    pref = [0] * (n + 1)
    for i, ch in enumerate(text):
        pows[i + 1] = (pows[i] * base) % mod
        pref[i + 1] = (pref[i] * base + (ord(ch) - 96)) % mod

    def get_hash(l: int, r: int) -> int:
        # hash of text[l:r]
        return (pref[r] - pref[l] * pows[r - l]) % mod

    found: set[int] = set()
    for length in range(1, n // 2 + 1):
        for i in range(0, n - 2 * length + 1):
            h1 = get_hash(i, i + length)
            h2 = get_hash(i + length, i + 2 * length)
            if h1 == h2:
                found.add(get_hash(i, i + 2 * length))
    return len(found)
