from solution import maximum_gap


def test_maximum_gap_example():
    assert maximum_gap([3, 6, 9, 1]) == 3


def test_maximum_gap_single_element():
    assert maximum_gap([10]) == 0


def test_maximum_gap_duplicates():
    assert maximum_gap([5, 5, 5]) == 0


def test_maximum_gap_two_elements():
    assert maximum_gap([1, 1000000000]) == 999999999


def test_maximum_gap_uneven_spread():
    assert maximum_gap([1, 2, 3, 100, 101]) == 97


def test_maximum_gap_with_zero():
    assert maximum_gap([0, 7, 2, 2, 4]) == 3
