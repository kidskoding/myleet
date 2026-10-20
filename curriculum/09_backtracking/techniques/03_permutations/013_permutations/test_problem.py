from solution import permute


def to_sorted_lists(result: list[list]) -> list[tuple]:
    return sorted(tuple(group) for group in result)


def test_permute_single_element():
    assert permute([1]) == [[1]]


def test_permute_normal():
    assert to_sorted_lists(permute([1, 2, 3])) == to_sorted_lists(
        [
            [1, 2, 3],
            [1, 3, 2],
            [2, 1, 3],
            [2, 3, 1],
            [3, 1, 2],
            [3, 2, 1],
        ]
    )
