def stone_game_ix(stones: list[int]) -> bool:
    counts = [0, 0, 0]
    for x in stones:
        counts[x % 3] += 1
    zeros, ones, twos = counts
    if zeros % 2 == 0:
        return ones >= 1 and twos >= 1
    return abs(ones - twos) > 2
