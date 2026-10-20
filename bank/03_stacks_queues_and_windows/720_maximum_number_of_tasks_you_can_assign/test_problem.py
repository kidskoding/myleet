from solution import max_task_assign


def test_max_task_assign_example_one():
    assert max_task_assign([3, 2, 1], [0, 3, 3], 1, 1) == 3


def test_max_task_assign_pill_once():
    assert max_task_assign([5, 4], [0, 0, 0], 1, 5) == 1


def test_max_task_assign_example_three():
    assert max_task_assign([10, 15, 30], [0, 10, 10, 10, 10], 3, 10) == 2


def test_max_task_assign_no_pills_needed():
    assert max_task_assign([1, 2], [5, 5], 0, 0) == 2


def test_max_task_assign_too_weak():
    assert max_task_assign([10], [1], 1, 5) == 0


def test_max_task_assign_more_tasks_than_workers():
    assert max_task_assign([1, 1, 1, 1], [1, 1], 0, 0) == 2
