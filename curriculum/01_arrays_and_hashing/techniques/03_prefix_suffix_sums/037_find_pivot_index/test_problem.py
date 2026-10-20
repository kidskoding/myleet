from solution import pivot_index


def test_pivot_index_normal():
    assert pivot_index([1, 7, 3, 6, 5, 6]) == 3


def test_pivot_index_no_pivot():
    assert pivot_index([1, 2, 3]) == -1


def test_pivot_index_at_start():
    assert pivot_index([2, 1, -1]) == 0
