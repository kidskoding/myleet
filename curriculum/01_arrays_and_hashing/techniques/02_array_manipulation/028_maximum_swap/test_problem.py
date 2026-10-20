from solution import maximum_swap


def test_maximum_swap_normal():
    assert maximum_swap(2736) == 7236


def test_maximum_swap_already_maximal():
    assert maximum_swap(9973) == 9973


def test_maximum_swap_repeated_digits():
    assert maximum_swap(1993) == 9913


def test_maximum_swap_uses_the_last_occurrence():
    assert maximum_swap(98368) == 98863
