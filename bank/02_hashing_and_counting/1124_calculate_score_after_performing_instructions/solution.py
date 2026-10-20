def calculate_score(instructions: list[str], values: list[int]) -> int:
    n = len(instructions)
    seen = [False] * n
    score = 0
    i = 0
    while 0 <= i < n and not seen[i]:
        seen[i] = True
        if instructions[i] == "add":
            score += values[i]
            i += 1
        else:
            i += values[i]
    return score
