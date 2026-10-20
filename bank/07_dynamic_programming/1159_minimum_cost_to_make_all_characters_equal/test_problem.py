from solution import minimum_cost


def test_minimum_cost_one_boundary():
    assert minimum_cost("0011") == 2


def test_minimum_cost_alternating():
    assert minimum_cost("010101") == 9


def test_minimum_cost_single_character():
    assert minimum_cost("0") == 0


def test_minimum_cost_already_equal():
    assert minimum_cost("1111") == 0


def test_minimum_cost_boundaries_near_both_ends():
    assert minimum_cost("0110") == 2


def test_minimum_cost_two_characters():
    assert minimum_cost("01") == 1
