def time_required_to_buy(tickets: list[int], k: int) -> int:
    target = tickets[k]
    return sum(min(t, target if i <= k else target - 1) for i, t in enumerate(tickets))
