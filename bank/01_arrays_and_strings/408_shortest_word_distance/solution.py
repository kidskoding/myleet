def shortest_distance(words_dict: list[str], word1: str, word2: str) -> int:
    # Time: O(n).
    # Space: O(1).
    i1 = i2 = -1
    best = len(words_dict)
    for i, w in enumerate(words_dict):
        if w == word1:
            i1 = i
        elif w == word2:
            i2 = i
        if i1 != -1 and i2 != -1:
            best = min(best, abs(i1 - i2))
    return best
