from solution import employee_free_time


def test_employee_free_time_empty():
    assert employee_free_time([]) == []


def test_employee_free_time_normal():
    schedule = [[[1, 2], [5, 6]], [[1, 3]], [[4, 10]]]
    assert employee_free_time(schedule) == [[3, 4]]


def test_employee_free_time_no_gaps():
    schedule = [[[1, 5]], [[2, 3]], [[4, 6]]]
    assert employee_free_time(schedule) == []
