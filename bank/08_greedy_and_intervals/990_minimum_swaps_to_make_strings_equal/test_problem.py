from solution import minimum_swap


def test_minimum_swap_same_type_pair():
    assert minimum_swap("xx", "yy") == 1


def test_minimum_swap_mixed_pair():
    assert minimum_swap("xy", "yx") == 2


def test_minimum_swap_impossible():
    assert minimum_swap("xx", "xy") == -1


def test_minimum_swap_already_equal():
    assert minimum_swap("xyx", "xyx") == 0


def test_minimum_swap_longer():
    assert minimum_swap("xxyyxyxyxx", "xyyxyxxxyx") == 4
