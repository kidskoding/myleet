def average_waiting_time(customers: list[list[int]]) -> float:
    free_at = 0
    total_wait = 0
    for arrival, prep in customers:
        free_at = max(free_at, arrival) + prep
        total_wait += free_at - arrival
    return total_wait / len(customers)
