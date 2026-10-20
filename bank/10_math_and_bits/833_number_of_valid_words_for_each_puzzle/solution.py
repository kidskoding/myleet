from collections import Counter


def find_num_of_valid_words(words: list[str], puzzles: list[str]) -> list[int]:
    masks: Counter[int] = Counter()
    for word in words:
        mask = 0
        for ch in word:
            mask |= 1 << (ord(ch) - 97)
        masks[mask] += 1
    result = []
    for puzzle in puzzles:
        first = 1 << (ord(puzzle[0]) - 97)
        rest = 0
        for ch in puzzle[1:]:
            rest |= 1 << (ord(ch) - 97)
        total = 0
        sub = rest
        while True:
            total += masks[sub | first]
            if sub == 0:
                break
            sub = (sub - 1) & rest
        result.append(total)
    return result
