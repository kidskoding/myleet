from solution import remove_covered_intervals


def test_remove_covered_intervals_normal():
    assert remove_covered_intervals([[1, 4], [3, 6], [2, 8]]) == 2


def test_remove_covered_intervals_nested():
    assert remove_covered_intervals([[1, 4], [2, 3]]) == 1
