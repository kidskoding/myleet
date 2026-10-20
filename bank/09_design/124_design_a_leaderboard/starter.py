class Leaderboard:
    # Problem 124: Design A Leaderboard
    # Time:
    # Space:

    def __init__(self) -> None:
        raise NotImplementedError

    def add_score(self, player_id: int, score: int) -> None:
        raise NotImplementedError

    def top(self, k: int) -> int:
        raise NotImplementedError

    def reset(self, player_id: int) -> None:
        raise NotImplementedError
