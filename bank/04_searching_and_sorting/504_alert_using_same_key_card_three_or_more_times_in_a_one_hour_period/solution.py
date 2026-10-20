from collections import defaultdict


def alert_names(key_name: list[str], key_time: list[str]) -> list[str]:
    uses: dict[str, list[int]] = defaultdict(list)
    for name, time in zip(key_name, key_time):
        hours, minutes = time.split(":")
        uses[name].append(int(hours) * 60 + int(minutes))
    alerted = []
    for name, times in uses.items():
        times.sort()
        if any(times[i + 2] - times[i] <= 60 for i in range(len(times) - 2)):
            alerted.append(name)
    return sorted(alerted)
