from solution import is_robot_bounded


def test_is_robot_bounded_returns_to_origin():
    assert is_robot_bounded("GGLLGG") is True


def test_is_robot_bounded_walks_away():
    assert is_robot_bounded("GG") is False


def test_is_robot_bounded_turns_in_loop():
    assert is_robot_bounded("GL") is True


def test_is_robot_bounded_only_turns():
    assert is_robot_bounded("L") is True


def test_is_robot_bounded_full_turn_then_walk():
    assert is_robot_bounded("GLLLLG") is False


def test_is_robot_bounded_reverses_direction():
    assert is_robot_bounded("GLLG") is True
