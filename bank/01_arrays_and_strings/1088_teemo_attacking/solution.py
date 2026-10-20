def find_poisoned_duration(time_series: list[int], duration: int) -> int:
    total = 0
    for i in range(len(time_series) - 1):
        total += min(duration, time_series[i + 1] - time_series[i])
    return total + duration
