from solution import find_duplicate


def test_find_duplicate_normal():
    assert find_duplicate([1, 3, 4, 2, 2]) == 2


def test_find_duplicate_repeat_is_first_value():
    assert find_duplicate([3, 1, 3, 4, 2]) == 3
