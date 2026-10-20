from solution import subsets


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_subsets_empty():
    assert subsets([]) == [[]]


def test_subsets_single_element():
    assert to_sorted_sets(subsets([1])) == sorted([(), (1,)])


def test_subsets_normal():
    assert to_sorted_sets(subsets([1, 2, 3])) == to_sorted_sets([[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]])
