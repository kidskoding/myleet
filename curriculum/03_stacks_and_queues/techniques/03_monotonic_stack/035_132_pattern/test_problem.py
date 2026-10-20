from solution import find132pattern


def test_find132pattern_increasing_has_none():
    assert find132pattern([1, 2, 3, 4]) is False


def test_find132pattern_present():
    assert find132pattern([3, 1, 4, 2]) is True


def test_find132pattern_with_negatives():
    assert find132pattern([-1, 3, 2, 0]) is True
