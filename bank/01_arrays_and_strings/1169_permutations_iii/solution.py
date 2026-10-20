def permute(n: int) -> list[list[int]]:
    result: list[list[int]] = []
    path: list[int] = []
    used = [False] * (n + 1)

    def place() -> None:
        if len(path) == n:
            result.append(path[:])
            return
        for v in range(1, n + 1):
            if not used[v] and (not path or (path[-1] - v) % 2):
                used[v] = True
                path.append(v)
                place()
                path.pop()
                used[v] = False

    place()
    return result
