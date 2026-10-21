from solution import maximum_triplet_value


def test_maximum_triplet_value_simple():
    assert maximum_triplet_value([1, 2, 3]) == 1 - 2 + 3


def test_maximum_triplet_value_larger_left():
    # best is 5 - 6 + 10? 5<6<10 → 5-6+10=9; or 1-6+10=5; or 1-2+10=9
    assert maximum_triplet_value([1, 5, 2, 6, 10]) == 9


def test_maximum_triplet_value_decreasing_prefix():
    assert maximum_triplet_value([5, 4, 3, 6, 7]) == 5 - 6 + 7


def test_maximum_triplet_value_long_increase():
    assert maximum_triplet_value([1, 3, 2, 4, 5]) == 1 - 2 + 5


def test_maximum_triplet_value_pick_large_left():
    assert maximum_triplet_value([2, 8, 3, 9]) == 8
