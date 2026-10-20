def max_profit_assignment(difficulty: list[int], profit: list[int], worker: list[int]) -> int:
    jobs = sorted(zip(difficulty, profit))
    total = best = i = 0
    for ability in sorted(worker):
        while i < len(jobs) and jobs[i][0] <= ability:
            best = max(best, jobs[i][1])
            i += 1
        total += best
    return total
