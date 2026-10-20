from solution import single_non_duplicate


def test_single_non_duplicate_early():
    assert single_non_duplicate([1, 1, 2, 3, 3, 4, 4, 8, 8]) == 2


def test_single_non_duplicate_late():
    assert single_non_duplicate([3, 3, 7, 7, 10, 11, 11]) == 10


def test_single_non_duplicate_single_element():
    assert single_non_duplicate([1]) == 1
