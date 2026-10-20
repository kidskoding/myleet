from solution import combination_sum3


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_combination_sum3_normal():
    assert to_sorted_sets(combination_sum3(3, 7)) == to_sorted_sets([[1, 2, 4]])


def test_combination_sum3_no_solution():
    assert combination_sum3(9, 1) == []
