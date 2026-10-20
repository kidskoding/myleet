from solution import min_operations


def test_min_operations_two_queries():
    assert min_operations([3, 1, 6, 8], [1, 5]) == [14, 10]


def test_min_operations_query_above_all():
    assert min_operations([2, 9, 6, 3], [10]) == [20]


def test_min_operations_single_element():
    assert min_operations([5], [5, 1, 9]) == [0, 4, 4]


def test_min_operations_duplicates():
    assert min_operations([2, 2, 2, 7], [2, 7]) == [5, 15]


def test_min_operations_large_values():
    assert min_operations([1, 1_000_000_000], [1_000_000_000]) == [999_999_999]
