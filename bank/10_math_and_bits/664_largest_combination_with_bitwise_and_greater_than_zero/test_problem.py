from solution import largest_combination


def test_largest_combination_example_one():
    assert largest_combination([16, 17, 71, 62, 12, 24, 14]) == 4


def test_largest_combination_duplicates():
    assert largest_combination([8, 8]) == 2


def test_largest_combination_single():
    assert largest_combination([1]) == 1


def test_largest_combination_disjoint_bits():
    assert largest_combination([1, 2, 4, 8]) == 1


def test_largest_combination_high_bit():
    assert largest_combination([10**7, 10**7, 1]) == 2
