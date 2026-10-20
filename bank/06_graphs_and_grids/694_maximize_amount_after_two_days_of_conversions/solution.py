from collections import defaultdict


def _amounts(start: str, pairs: list[list[str]], rates: list[float]) -> dict[str, float]:
    graph: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for (a, b), rate in zip(pairs, rates):
        graph[a].append((b, rate))
        graph[b].append((a, 1.0 / rate))
    amount = {start: 1.0}
    stack = [start]
    while stack:
        cur = stack.pop()
        for nxt, rate in graph[cur]:
            if nxt not in amount:
                amount[nxt] = amount[cur] * rate
                stack.append(nxt)
    return amount


def max_amount(
    initial_currency: str,
    pairs1: list[list[str]],
    rates1: list[float],
    pairs2: list[list[str]],
    rates2: list[float],
) -> float:
    day1 = _amounts(initial_currency, pairs1, rates1)
    day2 = _amounts(initial_currency, pairs2, rates2)
    return max(day1[c] / day2[c] for c in day1 if c in day2)
