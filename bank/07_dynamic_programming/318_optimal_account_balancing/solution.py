def min_transfers(transactions: list[list[int]]) -> int:
    balance: dict[int, int] = {}
    for giver, receiver, amount in transactions:
        balance[giver] = balance.get(giver, 0) + amount
        balance[receiver] = balance.get(receiver, 0) - amount
    debts = [v for v in balance.values() if v != 0]
    n = len(debts)
    full = 1 << n
    total = [0] * full
    for mask in range(1, full):
        low = mask & -mask
        total[mask] = total[mask ^ low] + debts[low.bit_length() - 1]
    groups = [0] * full
    for mask in range(1, full):
        best = 0
        for i in range(n):
            if mask & (1 << i):
                best = max(best, groups[mask ^ (1 << i)])
        groups[mask] = best + (1 if total[mask] == 0 else 0)
    return n - groups[full - 1]
