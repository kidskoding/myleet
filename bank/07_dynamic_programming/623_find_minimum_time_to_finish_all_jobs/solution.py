def minimum_time_required(jobs: list[int], k: int) -> int:
    jobs = sorted(jobs, reverse=True)
    loads = [0] * k
    best = sum(jobs)

    def place(i: int, current: int) -> None:
        nonlocal best
        if current >= best:
            return
        if i == len(jobs):
            best = current
            return
        tried: set[int] = set()
        for w in range(k):
            if loads[w] in tried:
                continue
            tried.add(loads[w])
            loads[w] += jobs[i]
            place(i + 1, max(current, loads[w]))
            loads[w] -= jobs[i]

    place(0, 0)
    return best
