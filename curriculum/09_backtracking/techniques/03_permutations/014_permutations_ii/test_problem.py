from solution import permute_unique


def to_sorted_lists(result: list[list]) -> list[tuple]:
    return sorted(tuple(group) for group in result)


def test_permute_unique_all_same():
    assert permute_unique([1, 1]) == [[1, 1]]


def test_permute_unique_normal():
    assert to_sorted_lists(permute_unique([1, 1, 2])) == to_sorted_lists([[1, 1, 2], [1, 2, 1], [2, 1, 1]])
