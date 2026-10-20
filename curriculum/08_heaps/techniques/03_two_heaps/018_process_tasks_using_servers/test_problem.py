from solution import assign_tasks


def test_assign_tasks_normal():
    assert assign_tasks([3, 3, 2], [1, 2, 3, 2, 1, 2]) == [2, 2, 0, 2, 1, 2]


def test_assign_tasks_single_server():
    assert assign_tasks([5], [2, 1, 2, 4, 5, 2, 1]) == [0, 0, 0, 0, 0, 0, 0]
