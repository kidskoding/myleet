def length_of_last_word(s: str) -> int:
    i = len(s) - 1
    while s[i] == " ":
        i -= 1
    length = 0
    while i >= 0 and s[i] != " ":
        length += 1
        i -= 1
    return length
