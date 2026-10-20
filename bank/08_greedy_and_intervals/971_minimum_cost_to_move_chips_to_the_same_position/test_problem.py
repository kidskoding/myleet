from solution import min_cost_to_move_chips


def test_min_cost_to_move_chips_example_one():
    assert min_cost_to_move_chips([1, 2, 3]) == 1


def test_min_cost_to_move_chips_example_two():
    assert min_cost_to_move_chips([2, 2, 2, 3, 3]) == 2


def test_min_cost_to_move_chips_far_apart():
    assert min_cost_to_move_chips([1, 1000000000]) == 1


def test_min_cost_to_move_chips_single():
    assert min_cost_to_move_chips([5]) == 0


def test_min_cost_to_move_chips_same_parity():
    assert min_cost_to_move_chips([2, 4, 100]) == 0
