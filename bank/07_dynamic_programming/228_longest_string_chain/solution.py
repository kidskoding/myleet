def longest_str_chain(words: list[str]) -> int:
    best: dict[str, int] = {}
    for word in sorted(words, key=len):
        best[word] = 1 + max((best.get(word[:i] + word[i + 1 :], 0) for i in range(len(word))), default=0)
    return max(best.values())
