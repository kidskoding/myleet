from solution import fixed_ratio


def test_fixed_ratio_example_one_to_two():
    assert fixed_ratio("0110011", 1, 2) == 4


def test_fixed_ratio_example_none():
    assert fixed_ratio("10101", 3, 1) == 0


def test_fixed_ratio_pair():
    assert fixed_ratio("01", 1, 1) == 1


def test_fixed_ratio_single_zero():
    assert fixed_ratio("0", 1, 1) == 0


def test_fixed_ratio_balanced_blocks():
    assert fixed_ratio("0011", 1, 1) == 2


def test_fixed_ratio_alternating():
    assert fixed_ratio("010101", 1, 1) == 9
