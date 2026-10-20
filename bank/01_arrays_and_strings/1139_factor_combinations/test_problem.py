from math import prod

from solution import get_factors


def normalize(combos):
    return sorted(sorted(combo) for combo in combos)


def test_get_factors_one():
    assert get_factors(1) == []


def test_get_factors_twelve():
    assert normalize(get_factors(12)) == [[2, 2, 3], [2, 6], [3, 4]]


def test_get_factors_prime():
    assert get_factors(37) == []


def test_get_factors_square_of_prime():
    assert normalize(get_factors(4)) == [[2, 2]]


def test_get_factors_power_of_two():
    expected = [[2, 2, 2, 2, 2], [2, 2, 2, 4], [2, 2, 8], [2, 4, 4], [2, 16], [4, 8]]
    assert normalize(get_factors(32)) == expected


def test_get_factors_many_combinations_no_duplicates():
    combos = normalize(get_factors(360))
    assert len(combos) == 51
    assert len({tuple(c) for c in combos}) == 51
    assert all(prod(c) == 360 and len(c) >= 2 and min(c) >= 2 for c in combos)
