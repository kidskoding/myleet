def reverse_prefix(word: str, ch: str) -> str:
    i = word.find(ch)
    if i == -1:
        return word
    return word[: i + 1][::-1] + word[i + 1 :]
