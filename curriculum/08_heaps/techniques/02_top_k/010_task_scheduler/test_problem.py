from solution import least_interval


def test_least_interval_normal():
    assert least_interval(["A", "A", "A", "B", "B", "B"], 2) == 8


def test_least_interval_no_cooldown():
    assert least_interval(["A", "A", "A", "B", "B", "B"], 0) == 6


def test_least_interval_single_task_type():
    assert least_interval(["A", "A", "A"], 2) == 7
