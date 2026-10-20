from solution import combine


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_combine_normal():
    assert to_sorted_sets(combine(4, 2)) == to_sorted_sets([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]])


def test_combine_k_equals_n():
    assert combine(2, 2) == [[1, 2]]
