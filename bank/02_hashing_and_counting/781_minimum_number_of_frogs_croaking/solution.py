def min_number_of_frogs(croak_of_frogs: str) -> int:
    stage = {ch: i for i, ch in enumerate("croak")}
    counts = [0] * 5
    active = best = 0
    for ch in croak_of_frogs:
        i = stage.get(ch)
        if i is None:
            return -1
        if i == 0:
            active += 1
            best = max(best, active)
        else:
            if counts[i - 1] == 0:
                return -1
            counts[i - 1] -= 1
        if i == 4:
            active -= 1
        else:
            counts[i] += 1
    return best if active == 0 else -1
