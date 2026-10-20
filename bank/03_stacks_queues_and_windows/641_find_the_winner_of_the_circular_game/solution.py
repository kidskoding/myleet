def find_the_winner(n: int, k: int) -> int:
    winner = 0
    for size in range(2, n + 1):
        winner = (winner + k) % size
    return winner + 1
