from solution import get_final_state


def test_get_final_state_example():
    assert get_final_state([2, 1, 3, 5, 6], 5, 2) == [8, 4, 6, 5, 6]


def test_get_final_state_alternating_minimum():
    assert get_final_state([1, 2], 3, 4) == [16, 8]


def test_get_final_state_ties_pick_first_index():
    assert get_final_state([3, 3, 3], 2, 2) == [6, 6, 3]


def test_get_final_state_multiplier_one():
    assert get_final_state([5, 1], 3, 1) == [5, 1]


def test_get_final_state_single_element():
    assert get_final_state([7], 2, 3) == [63]
