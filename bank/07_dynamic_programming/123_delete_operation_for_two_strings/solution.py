def min_distance(word1: str, word2: str) -> int:
    prev = [0] * (len(word2) + 1)
    for ch in word1:
        cur = [0] * (len(word2) + 1)
        for j, other in enumerate(word2, 1):
            cur[j] = prev[j - 1] + 1 if ch == other else max(prev[j], cur[j - 1])
        prev = cur
    return len(word1) + len(word2) - 2 * prev[-1]
