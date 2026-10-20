from solution import brightest_position


def test_brightest_position_overlap_at_shared_endpoint():
    assert brightest_position([[-3, 2], [1, 2], [3, 3]]) == -1


def test_brightest_position_zero_range_lamp():
    assert brightest_position([[1, 0], [0, 1]]) == 1


def test_brightest_position_single_lamp_leftmost_point():
    assert brightest_position([[1, 2]]) == -1


def test_brightest_position_point_lamp():
    assert brightest_position([[0, 0]]) == 0


def test_brightest_position_disjoint_lamps_tie():
    assert brightest_position([[0, 1], [3, 1]]) == -1


def test_brightest_position_stacked_point_lamps():
    assert brightest_position([[5, 0], [5, 0], [0, 10]]) == 5
