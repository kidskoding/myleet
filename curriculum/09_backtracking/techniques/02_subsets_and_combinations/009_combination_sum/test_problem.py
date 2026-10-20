from solution import combination_sum


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_combination_sum_normal():
    assert to_sorted_sets(combination_sum([2, 3, 6, 7], 7)) == to_sorted_sets([[2, 2, 3], [7]])


def test_combination_sum_no_solution():
    assert combination_sum([5], 3) == []
