import heapq


class Leaderboard:
    def __init__(self) -> None:
        self.scores: dict[int, int] = {}

    def add_score(self, player_id: int, score: int) -> None:
        self.scores[player_id] = self.scores.get(player_id, 0) + score

    def top(self, k: int) -> int:
        return sum(heapq.nlargest(k, self.scores.values()))

    def reset(self, player_id: int) -> None:
        self.scores.pop(player_id, None)
