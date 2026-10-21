def minimum_steps(s: str) -> int:
    ones = 0
    steps = 0
    for ch in s:
        if ch == "1":
            ones += 1
        else:
            steps += ones
    return steps
