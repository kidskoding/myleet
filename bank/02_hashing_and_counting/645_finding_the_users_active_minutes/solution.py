from collections import defaultdict


def finding_users_active_minutes(logs: list[list[int]], k: int) -> list[int]:
    minutes: dict[int, set[int]] = defaultdict(set)
    for user, minute in logs:
        minutes[user].add(minute)
    answer = [0] * k
    for active in minutes.values():
        answer[len(active) - 1] += 1
    return answer
