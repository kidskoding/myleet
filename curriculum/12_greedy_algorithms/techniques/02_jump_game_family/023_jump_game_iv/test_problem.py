from solution import min_jumps


def test_min_jumps_uses_teleports():
    assert min_jumps([100, -23, -23, 404, 100, 23, 23, 23, 3, 404]) == 3


def test_min_jumps_single_element():
    assert min_jumps([7]) == 0


def test_min_jumps_same_value_ends():
    assert min_jumps([7, 6, 9, 6, 9, 6, 9, 7]) == 1
