def possible_string_count(word: str) -> int:
    return 1 + sum(1 for a, b in zip(word, word[1:]) if a == b)
