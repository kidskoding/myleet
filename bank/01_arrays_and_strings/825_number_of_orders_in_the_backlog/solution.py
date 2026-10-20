import heapq

MOD = 10**9 + 7


def get_number_of_backlog_orders(orders: list[list[int]]) -> int:
    buys: list[list[int]] = []
    sells: list[list[int]] = []
    for price, amount, kind in orders:
        if kind == 0:
            while amount and sells and sells[0][0] <= price:
                used = min(amount, sells[0][1])
                amount -= used
                sells[0][1] -= used
                if sells[0][1] == 0:
                    heapq.heappop(sells)
            if amount:
                heapq.heappush(buys, [-price, amount])
        else:
            while amount and buys and -buys[0][0] >= price:
                used = min(amount, buys[0][1])
                amount -= used
                buys[0][1] -= used
                if buys[0][1] == 0:
                    heapq.heappop(buys)
            if amount:
                heapq.heappush(sells, [price, amount])
    return (sum(a for _, a in buys) + sum(a for _, a in sells)) % MOD
