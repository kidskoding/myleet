from solution import maximum_strength


def test_maximum_strength_example_three():
    assert maximum_strength([1, 2, 3, -1, 2], 3) == 22


def test_maximum_strength_every_element_its_own():
    assert maximum_strength([12, -2, -2, -2, -2], 5) == 64


def test_maximum_strength_k_one_all_negative():
    assert maximum_strength([-1, -2, -3], 1) == -1


def test_maximum_strength_k_one_is_max_subarray():
    assert maximum_strength([2, -1, 3], 1) == 4


def test_maximum_strength_forced_negative_subarrays():
    assert maximum_strength([-1, -1, -1], 3) == -2


def test_maximum_strength_single_element():
    assert maximum_strength([5], 1) == 5
