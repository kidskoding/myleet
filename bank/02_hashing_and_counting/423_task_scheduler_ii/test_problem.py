from solution import task_scheduler_ii


def test_task_scheduler_ii_example_one():
    assert task_scheduler_ii([1, 2, 1, 2, 3, 1], 3) == 9


def test_task_scheduler_ii_example_two():
    assert task_scheduler_ii([5, 8, 8, 5], 2) == 6


def test_task_scheduler_ii_single():
    assert task_scheduler_ii([1], 5) == 1


def test_task_scheduler_ii_zero_space():
    assert task_scheduler_ii([1, 1, 1], 0) == 3


def test_task_scheduler_ii_back_to_back():
    assert task_scheduler_ii([1, 1], 1) == 3
    assert task_scheduler_ii([7, 7, 7], 10**9) == 2 * (10**9 + 1) + 1
