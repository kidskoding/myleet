from collections import defaultdict


def find_high_access_employees(access_times: list[list[str]]) -> list[str]:
    by_name: dict[str, list[int]] = defaultdict(list)
    for name, hhmm in access_times:
        by_name[name].append(int(hhmm[:2]) * 60 + int(hhmm[2:]))
    result = []
    for name, times in by_name.items():
        times.sort()
        if any(times[i + 2] - times[i] < 60 for i in range(len(times) - 2)):
            result.append(name)
    return result
