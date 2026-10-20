from solution import first_missing_positive


def test_first_missing_positive_normal():
    assert first_missing_positive([3, 4, -1, 1]) == 2


def test_first_missing_positive_all_present():
    assert first_missing_positive([1, 2, 0]) == 3


def test_first_missing_positive_disjoint():
    assert first_missing_positive([7, 8, 9]) == 1


def test_first_missing_positive_empty():
    assert first_missing_positive([]) == 1


def test_first_missing_positive_single_element():
    assert first_missing_positive([1]) == 2
