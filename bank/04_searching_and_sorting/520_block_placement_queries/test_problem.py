from solution import get_results


def test_get_results_example_one():
    assert get_results([[1, 2], [2, 3, 3], [2, 3, 1], [2, 2, 2]]) == [False, True, True]


def test_get_results_example_two():
    assert get_results([[1, 7], [2, 7, 6], [1, 2], [2, 7, 5], [2, 7, 6]]) == [True, True, False]


def test_get_results_no_obstacles():
    assert get_results([[2, 5, 5], [2, 5, 6]]) == [True, False]


def test_get_results_tail_after_last_obstacle():
    assert get_results([[1, 1], [2, 10, 9], [2, 10, 10]]) == [True, False]


def test_get_results_obstacle_after_x_is_ignored():
    assert get_results([[1, 4], [2, 3, 3], [1, 2], [2, 3, 3], [2, 3, 2]]) == [True, False, True]
