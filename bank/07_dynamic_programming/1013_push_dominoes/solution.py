def push_dominoes(dominoes: str) -> str:
    n = len(dominoes)
    force = [0] * n
    f = 0
    for i, ch in enumerate(dominoes):
        if ch == "R":
            f = n
        elif ch == "L":
            f = 0
        else:
            f = max(f - 1, 0)
        force[i] += f
    f = 0
    for i in range(n - 1, -1, -1):
        ch = dominoes[i]
        if ch == "L":
            f = n
        elif ch == "R":
            f = 0
        else:
            f = max(f - 1, 0)
        force[i] -= f
    return "".join("R" if x > 0 else "L" if x < 0 else "." for x in force)
