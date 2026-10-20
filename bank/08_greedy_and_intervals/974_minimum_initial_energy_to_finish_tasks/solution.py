def minimum_effort(tasks: list[list[int]]) -> int:
    spent = 0
    need = 0
    for actual, minimum in sorted(tasks, key=lambda t: t[0] - t[1]):
        need = max(need, spent + minimum)
        spent += actual
    return need
