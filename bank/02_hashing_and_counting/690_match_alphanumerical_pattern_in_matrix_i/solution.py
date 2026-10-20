def find_pattern(board: list[list[int]], pattern: list[str]) -> list[int]:
    rows, cols = len(board), len(board[0])
    p_rows, p_cols = len(pattern), len(pattern[0])

    def matches(top: int, left: int) -> bool:
        letter_to_digit: dict[str, int] = {}
        digit_to_letter: dict[int, str] = {}
        for r in range(p_rows):
            for c in range(p_cols):
                ch = pattern[r][c]
                value = board[top + r][left + c]
                if ch.isdigit():
                    if int(ch) != value:
                        return False
                elif letter_to_digit.setdefault(ch, value) != value:
                    return False
                elif digit_to_letter.setdefault(value, ch) != ch:
                    return False
        return True

    for top in range(rows - p_rows + 1):
        for left in range(cols - p_cols + 1):
            if matches(top, left):
                return [top, left]
    return [-1, -1]
