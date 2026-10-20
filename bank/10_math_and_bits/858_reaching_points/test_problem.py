from solution import reaching_points


def test_reaching_points_example_reachable():
    assert reaching_points(1, 1, 3, 5) is True


def test_reaching_points_example_unreachable():
    assert reaching_points(1, 1, 2, 2) is False


def test_reaching_points_example_same_point():
    assert reaching_points(1, 1, 1, 1) is True


def test_reaching_points_long_single_axis():
    assert reaching_points(1, 1, 1000000000, 1) is True


def test_reaching_points_multiple_steps():
    assert reaching_points(3, 3, 12, 9) is True


def test_reaching_points_target_below_start():
    assert reaching_points(1, 2, 1, 1) is False
