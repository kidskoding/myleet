def mice_and_cheese(reward1: list[int], reward2: list[int], k: int) -> int:
    gains = sorted((a - b for a, b in zip(reward1, reward2)), reverse=True)
    return sum(reward2) + sum(gains[:k])
