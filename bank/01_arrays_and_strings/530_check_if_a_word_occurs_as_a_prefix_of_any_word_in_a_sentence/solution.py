def is_prefix_of_word(sentence: str, search_word: str) -> int:
    for i, word in enumerate(sentence.split(), start=1):
        if word.startswith(search_word):
            return i
    return -1
