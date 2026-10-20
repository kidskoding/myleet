def longest_beautiful_substring(word: str) -> int:
    best = 0
    length = distinct = 1
    for i in range(1, len(word)):
        if word[i] < word[i - 1]:
            length = distinct = 1
            continue
        length += 1
        if word[i] > word[i - 1]:
            distinct += 1
        if distinct == 5:
            best = max(best, length)
    return best
