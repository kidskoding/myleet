from solution import robot_sim


def test_robot_sim_no_obstacles():
    assert robot_sim([4, -1, 3], []) == 25


def test_robot_sim_blocked():
    assert robot_sim([4, -1, 4, -2, 4], [[2, 4]]) == 65


def test_robot_sim_obstacle_at_origin():
    assert robot_sim([6, -1, -1, 6], [[0, 0]]) == 36


def test_robot_sim_only_turns():
    assert robot_sim([-1, -2, -1], []) == 0


def test_robot_sim_max_is_not_final():
    # Goes north 5, turns around, comes back 5.
    assert robot_sim([5, -1, -1, 5], []) == 25


def test_robot_sim_wall_directly_ahead():
    assert robot_sim([3], [[0, 1]]) == 0
