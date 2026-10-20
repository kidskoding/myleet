from solution import largest_even_sum


def test_largest_even_sum_top_k_even():
    assert largest_even_sum([4, 1, 5, 3, 1], 3) == 12


def test_largest_even_sum_take_all():
    assert largest_even_sum([4, 6, 2], 3) == 12


def test_largest_even_sum_impossible():
    assert largest_even_sum([1, 3, 5], 1) == -1


def test_largest_even_sum_swap_even_for_odd():
    assert largest_even_sum([5, 4, 3], 2) == 8


def test_largest_even_sum_swap_odd_for_even():
    assert largest_even_sum([9, 8, 2, 1], 2) == 10


def test_largest_even_sum_two_odds():
    assert largest_even_sum([1, 1], 2) == 2


def test_largest_even_sum_all_odd_odd_k():
    assert largest_even_sum([7, 5, 3], 3) == -1
