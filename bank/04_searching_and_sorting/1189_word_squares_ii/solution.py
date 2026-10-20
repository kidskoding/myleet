def word_squares(words: list[str]) -> list[list[str]]:
    squares = []
    for top in words:
        for left in words:
            if left == top or left[0] != top[0]:
                continue
            for right in words:
                if right in (top, left) or right[0] != top[3]:
                    continue
                for bottom in words:
                    if bottom in (top, left, right):
                        continue
                    if bottom[0] == left[3] and bottom[3] == right[3]:
                        squares.append([top, left, right, bottom])
    squares.sort()
    return squares
