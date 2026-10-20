from solution import TaskManager


def test_task_manager_example():
    manager = TaskManager([[1, 101, 10], [2, 102, 20], [3, 103, 15]])
    manager.add(4, 104, 5)
    manager.edit(102, 8)
    assert manager.exec_top() == 3
    manager.rmv(101)
    manager.add(5, 105, 15)
    assert manager.exec_top() == 5


def test_task_manager_empty_returns_minus_one():
    manager = TaskManager([[1, 1, 5]])
    assert manager.exec_top() == 1
    assert manager.exec_top() == -1


def test_task_manager_tie_prefers_larger_task_id():
    manager = TaskManager([[1, 10, 5], [2, 20, 5]])
    assert manager.exec_top() == 2
    assert manager.exec_top() == 1


def test_task_manager_edit_up_and_down():
    manager = TaskManager([[1, 1, 5], [2, 2, 6]])
    manager.edit(2, 1)
    assert manager.exec_top() == 1
    manager.add(3, 3, 0)
    manager.edit(3, 9)
    assert manager.exec_top() == 3
    assert manager.exec_top() == 2
    assert manager.exec_top() == -1


def test_task_manager_task_id_reused_after_removal():
    manager = TaskManager([[1, 5, 3]])
    manager.rmv(5)
    manager.add(9, 5, 3)
    assert manager.exec_top() == 9
    assert manager.exec_top() == -1
