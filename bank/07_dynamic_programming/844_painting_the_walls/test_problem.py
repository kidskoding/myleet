from solution import paint_walls


def test_paint_walls_example_slow_cheap():
    assert paint_walls([1, 2, 3, 2], [1, 2, 3, 2]) == 3


def test_paint_walls_example_unit_times():
    assert paint_walls([2, 3, 4, 2], [1, 1, 1, 1]) == 4


def test_paint_walls_single_wall():
    assert paint_walls([5], [1]) == 5


def test_paint_walls_one_long_job_covers_all():
    assert paint_walls([10, 1, 1, 1], [3, 1, 1, 1]) == 2


def test_paint_walls_expensive_long_job():
    assert paint_walls([100, 1, 1], [5, 1, 1]) == 2
