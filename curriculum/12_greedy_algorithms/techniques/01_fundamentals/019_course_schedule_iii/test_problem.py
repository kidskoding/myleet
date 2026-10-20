from solution import schedule_course


def test_schedule_course_normal():
    assert schedule_course([[100, 200], [200, 1300], [1000, 1250], [2000, 3200]]) == 3


def test_schedule_course_single_course_fits():
    assert schedule_course([[1, 2]]) == 1


def test_schedule_course_none_fit():
    assert schedule_course([[3, 2], [4, 3]]) == 0
