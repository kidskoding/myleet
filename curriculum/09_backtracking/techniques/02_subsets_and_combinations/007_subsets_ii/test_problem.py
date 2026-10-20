from solution import subsets_with_dup


def to_sorted_sets(result: list[list[int]]) -> list[tuple[int, ...]]:
    return sorted(tuple(sorted(group)) for group in result)


def test_subsets_with_dup_normal():
    assert to_sorted_sets(subsets_with_dup([1, 2, 2])) == to_sorted_sets([[], [1], [2], [1, 2], [2, 2], [1, 2, 2]])


def test_subsets_with_dup_all_same():
    assert to_sorted_sets(subsets_with_dup([2, 2])) == to_sorted_sets([[], [2], [2, 2]])
