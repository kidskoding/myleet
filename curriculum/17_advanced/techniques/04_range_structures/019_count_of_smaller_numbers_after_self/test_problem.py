from solution import count_smaller


def test_count_smaller_normal():
    assert count_smaller([5, 2, 6, 1]) == [2, 1, 1, 0]


def test_count_smaller_sorted_ascending():
    assert count_smaller([1, 2, 3]) == [0, 0, 0]


def test_count_smaller_empty():
    assert count_smaller([]) == []
