def min_cost_to_move_chips(position: list[int]) -> int:
    odd = sum(p % 2 for p in position)
    return min(odd, len(position) - odd)
