def count_days(days: int, meetings: list[list[int]]) -> int:
    covered = 0
    last_end = 0
    for start, end in sorted(meetings):
        if end <= last_end:
            continue
        covered += end - max(start, last_end + 1) + 1
        last_end = end
    return days - covered
