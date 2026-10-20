def prison_after_n_days(cells: list[int], n: int) -> list[int]:
    def step(state: tuple[int, ...]) -> tuple[int, ...]:
        return tuple(1 if 0 < i < len(state) - 1 and state[i - 1] == state[i + 1] else 0 for i in range(len(state)))

    state = tuple(cells)
    seen: dict[tuple[int, ...], int] = {}
    day = 0
    while day < n:
        if state in seen:
            cycle = day - seen[state]
            remaining = (n - day) % cycle
            for _ in range(remaining):
                state = step(state)
            return list(state)
        seen[state] = day
        state = step(state)
        day += 1
    return list(state)
