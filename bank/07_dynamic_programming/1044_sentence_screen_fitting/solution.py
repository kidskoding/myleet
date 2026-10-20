def words_typing(sentence: list[str], rows: int, cols: int) -> int:
    tape = " ".join(sentence) + " "
    length = len(tape)
    pos = 0
    for _ in range(rows):
        pos += cols
        if tape[pos % length] == " ":
            pos += 1
        else:
            while pos > 0 and tape[(pos - 1) % length] != " ":
                pos -= 1
    return pos // length
