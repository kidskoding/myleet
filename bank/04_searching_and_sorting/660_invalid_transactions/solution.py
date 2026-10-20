from collections import defaultdict


def invalid_transactions(transactions: list[str]) -> list[str]:
    parsed = []
    by_name: dict[str, list[int]] = defaultdict(list)
    for i, t in enumerate(transactions):
        name, time, amount, city = t.split(",")
        parsed.append((name, int(time), int(amount), city))
        by_name[name].append(i)
    result = []
    for i, (name, time, amount, city) in enumerate(parsed):
        if amount > 1000 or any(abs(parsed[j][1] - time) <= 60 and parsed[j][3] != city for j in by_name[name]):
            result.append(transactions[i])
    return result
