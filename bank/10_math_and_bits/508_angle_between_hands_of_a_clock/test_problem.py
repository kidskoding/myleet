from solution import angle_clock


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-5


def test_angle_clock_half_past_twelve():
    assert close(angle_clock(12, 30), 165)


def test_angle_clock_half_past_three():
    assert close(angle_clock(3, 30), 75)


def test_angle_clock_quarter_past_three():
    assert close(angle_clock(3, 15), 7.5)


def test_angle_clock_hands_overlap():
    assert close(angle_clock(12, 0), 0)


def test_angle_clock_takes_smaller_angle():
    assert close(angle_clock(4, 50), 155)


def test_angle_clock_straight_line():
    assert close(angle_clock(6, 0), 180)
