from solution import finding_users_active_minutes


def test_finding_users_active_minutes_example_one():
    assert finding_users_active_minutes([[0, 5], [1, 2], [0, 2], [0, 5], [1, 3]], 5) == [0, 2, 0, 0, 0]


def test_finding_users_active_minutes_example_two():
    assert finding_users_active_minutes([[1, 1], [2, 2], [2, 3]], 4) == [1, 1, 0, 0]


def test_finding_users_active_minutes_single_log():
    assert finding_users_active_minutes([[7, 1]], 1) == [1]


def test_finding_users_active_minutes_repeated_minute():
    assert finding_users_active_minutes([[1, 1], [1, 1], [1, 1]], 2) == [1, 0]


def test_finding_users_active_minutes_same_minute_different_users():
    assert finding_users_active_minutes([[1, 4], [2, 4], [3, 4], [3, 5]], 3) == [2, 1, 0]
