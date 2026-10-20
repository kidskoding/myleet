def judge_circle(moves: str) -> bool:
    # Time: O(n).
    # Space: O(1).
    return moves.count("U") == moves.count("D") and moves.count("L") == moves.count("R")
