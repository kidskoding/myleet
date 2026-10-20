from solution import total_strength


def test_total_strength_example_one():
    assert total_strength([1, 3, 1, 2]) == 44


def test_total_strength_example_two():
    assert total_strength([5, 4, 6]) == 213


def test_total_strength_single():
    assert total_strength([5]) == 25


def test_total_strength_equal_values():
    assert total_strength([1, 1]) == 4
    assert total_strength([2, 2, 2]) == 40


def test_total_strength_repeated_minimum():
    assert total_strength([3, 1, 2, 4, 1]) == 104


def test_total_strength_modulo():
    assert total_strength([10**9] * 3) == 490
