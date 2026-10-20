MOD = 10**9 + 7


def ways_to_build_rooms(prev_room: list[int]) -> int:
    n = len(prev_room)
    children: list[list[int]] = [[] for _ in range(n)]
    for room in range(1, n):
        children[prev_room[room]].append(room)
    order = [0]
    for room in order:
        order.extend(children[room])
    size = [1] * n
    for room in reversed(order):
        if room:
            size[prev_room[room]] += size[room]
    numerator = 1
    denominator = 1
    for i in range(1, n + 1):
        numerator = numerator * i % MOD
    for s in size:
        denominator = denominator * s % MOD
    return numerator * pow(denominator, MOD - 2, MOD) % MOD
