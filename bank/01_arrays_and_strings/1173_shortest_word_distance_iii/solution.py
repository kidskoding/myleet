def shortest_word_distance(words_dict: list[str], word1: str, word2: str) -> int:
    best = len(words_dict)
    last1 = last2 = -1
    for i, word in enumerate(words_dict):
        if word1 == word2:
            if word == word1:
                if last1 >= 0:
                    best = min(best, i - last1)
                last1 = i
            continue
        if word == word1:
            last1 = i
        elif word == word2:
            last2 = i
        if last1 >= 0 and last2 >= 0:
            best = min(best, abs(last1 - last2))
    return best
