def get_factors(n: int) -> list[list[int]]:
    result: list[list[int]] = []

    def backtrack(remaining: int, start: int, path: list[int]) -> None:
        f = start
        while f * f <= remaining:
            if remaining % f == 0:
                result.append(path + [f, remaining // f])
                path.append(f)
                backtrack(remaining // f, f, path)
                path.pop()
            f += 1

    backtrack(n, 2, [])
    return result
