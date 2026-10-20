from solution import min_cost_to_equalize_array


def test_min_cost_to_equalize_array_two_elements():
    assert min_cost_to_equalize_array([4, 1], 5, 2) == 15


def test_min_cost_to_equalize_array_cheap_pairs():
    assert min_cost_to_equalize_array([2, 3, 3, 3, 5], 2, 1) == 6


def test_min_cost_to_equalize_array_expensive_pairs():
    assert min_cost_to_equalize_array([3, 5, 3], 1, 3) == 4


def test_min_cost_to_equalize_array_single_element():
    assert min_cost_to_equalize_array([7], 3, 1) == 0


def test_min_cost_to_equalize_array_raise_target_above_max():
    assert min_cost_to_equalize_array([1, 14, 14, 15], 2, 1) == 20


def test_min_cost_to_equalize_array_modulo():
    assert min_cost_to_equalize_array([1, 1000000], 1000000, 1) == 999999 * 1000000 % (10**9 + 7)
