from solution import combination_sum2


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_combination_sum2_normal():
    assert to_sorted_sets(combination_sum2([10, 1, 2, 7, 6, 1, 5], 8)) == to_sorted_sets([[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]])


def test_combination_sum2_no_solution():
    assert combination_sum2([2], 1) == []
