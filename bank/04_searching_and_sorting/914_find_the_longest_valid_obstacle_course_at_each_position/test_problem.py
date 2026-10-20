from solution import longest_obstacle_course_at_each_position


def test_longest_obstacle_course_increasing_then_dip():
    assert longest_obstacle_course_at_each_position([1, 2, 3, 2]) == [1, 2, 3, 3]


def test_longest_obstacle_course_equal_heights_extend():
    assert longest_obstacle_course_at_each_position([2, 2, 1]) == [1, 2, 1]


def test_longest_obstacle_course_mixed():
    assert longest_obstacle_course_at_each_position([3, 1, 5, 6, 4, 2]) == [1, 1, 2, 3, 2, 2]


def test_longest_obstacle_course_single():
    assert longest_obstacle_course_at_each_position([7]) == [1]


def test_longest_obstacle_course_all_equal():
    assert longest_obstacle_course_at_each_position([4, 4, 4, 4]) == [1, 2, 3, 4]


def test_longest_obstacle_course_strictly_decreasing():
    assert longest_obstacle_course_at_each_position([5, 4, 3, 2]) == [1, 1, 1, 1]
