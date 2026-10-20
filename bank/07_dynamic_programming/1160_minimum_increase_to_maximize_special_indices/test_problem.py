from solution import min_increase


def test_min_increase_three_elements():
    assert min_increase([1, 2, 2]) == 1


def test_min_increase_even_length_picks_cheaper():
    assert min_increase([2, 1, 1, 3]) == 2


def test_min_increase_odd_length_fixed_positions():
    assert min_increase([5, 2, 1, 4, 3]) == 4


def test_min_increase_flat_triple():
    assert min_increase([1, 1, 1]) == 1


def test_min_increase_existing_peaks_with_gap():
    assert min_increase([1, 5, 1, 1, 5, 1]) == 0


def test_min_increase_large_values():
    assert min_increase([10**9, 1, 10**9]) == 10**9
