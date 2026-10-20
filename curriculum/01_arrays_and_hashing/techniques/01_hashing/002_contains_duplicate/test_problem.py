from solution import contains_duplicate


def test_contains_duplicate_true():
    assert contains_duplicate([1, 2, 3, 1]) is True


def test_contains_duplicate_false():
    assert contains_duplicate([1, 2, 3, 4]) is False


def test_contains_duplicate_empty():
    assert contains_duplicate([]) is False


def test_contains_duplicate_single_element():
    assert contains_duplicate([1]) is False
