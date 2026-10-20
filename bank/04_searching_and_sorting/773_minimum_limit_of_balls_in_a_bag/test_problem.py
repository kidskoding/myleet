from solution import minimum_size


def test_minimum_size_single_bag():
    assert minimum_size([9], 2) == 3


def test_minimum_size_several_bags():
    assert minimum_size([2, 4, 8, 2], 4) == 2


def test_minimum_size_uneven_bags():
    assert minimum_size([7, 17], 2) == 7


def test_minimum_size_already_ones():
    assert minimum_size([1, 1, 1], 5) == 1


def test_minimum_size_huge_bag():
    assert minimum_size([1_000_000_000], 1) == 500_000_000
