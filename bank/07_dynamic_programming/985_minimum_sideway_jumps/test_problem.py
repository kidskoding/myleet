from solution import min_side_jumps


def test_min_side_jumps_example_one():
    assert min_side_jumps([0, 1, 2, 3, 0]) == 2


def test_min_side_jumps_middle_lane_clear():
    assert min_side_jumps([0, 1, 1, 3, 3, 0]) == 0


def test_min_side_jumps_example_three():
    assert min_side_jumps([0, 2, 1, 0, 3, 0]) == 2


def test_min_side_jumps_no_obstacles():
    assert min_side_jumps([0, 0]) == 0


def test_min_side_jumps_single_block():
    assert min_side_jumps([0, 2, 0]) == 1
