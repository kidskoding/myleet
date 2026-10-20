from solution import maximum_minutes


def test_maximum_minutes_example_one():
    grid = [
        [0, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 2, 1, 0],
        [0, 2, 0, 0, 1, 2, 0],
        [0, 0, 2, 2, 2, 0, 2],
        [0, 0, 0, 0, 0, 0, 0],
    ]
    assert maximum_minutes(grid) == 3


def test_maximum_minutes_impossible():
    assert maximum_minutes([[0, 0, 0, 0], [0, 1, 2, 0], [0, 2, 0, 0]]) == -1


def test_maximum_minutes_fire_walled_off():
    assert maximum_minutes([[0, 0, 0], [2, 2, 0], [1, 2, 0]]) == 1000000000


def test_maximum_minutes_no_fire():
    assert maximum_minutes([[0, 0], [0, 0]]) == 1000000000


def test_maximum_minutes_leave_immediately():
    assert maximum_minutes([[0, 1], [0, 2], [0, 0]]) == 0


def test_maximum_minutes_tie_at_safehouse_allowed():
    assert maximum_minutes([[0, 0, 0, 0, 0], [0, 2, 0, 0, 0], [0, 1, 2, 0, 0]]) == 2
