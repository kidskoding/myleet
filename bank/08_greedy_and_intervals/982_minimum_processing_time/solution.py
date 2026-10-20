def min_processing_time(processor_time: list[int], tasks: list[int]) -> int:
    procs = sorted(processor_time)
    longest = sorted(tasks, reverse=True)
    return max(p + longest[4 * i] for i, p in enumerate(procs))
