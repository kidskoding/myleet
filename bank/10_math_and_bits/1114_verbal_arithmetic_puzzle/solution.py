def is_solvable(words: list[str], result: str) -> bool:
    if max(len(w) for w in words) > len(result):
        return False
    leading = {w[0] for w in words + [result] if len(w) > 1}
    assigned: dict[str, int] = {}
    used = [False] * 10
    columns = len(result)

    def place(ch: str, digit: int) -> bool:
        if used[digit] or (digit == 0 and ch in leading):
            return False
        assigned[ch] = digit
        used[digit] = True
        return True

    def unplace(ch: str) -> None:
        used[assigned.pop(ch)] = False

    def solve(col: int, row: int, total: int) -> bool:
        if col == columns:
            return total == 0
        if row == len(words):
            ch = result[-1 - col]
            digit = total % 10
            if ch in assigned:
                return assigned[ch] == digit and solve(col + 1, 0, total // 10)
            if not place(ch, digit):
                return False
            ok = solve(col + 1, 0, total // 10)
            unplace(ch)
            return ok
        word = words[row]
        if col >= len(word):
            return solve(col, row + 1, total)
        ch = word[-1 - col]
        if ch in assigned:
            return solve(col, row + 1, total + assigned[ch])
        for digit in range(10):
            if place(ch, digit):
                ok = solve(col, row + 1, total + digit)
                unplace(ch)
                if ok:
                    return True
        return False

    return solve(0, 0, 0)
