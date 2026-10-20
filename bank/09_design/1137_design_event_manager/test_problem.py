from solution import EventManager


def test_event_manager_ties_and_update():
    manager = EventManager([[5, 7], [2, 7], [9, 4]])
    assert manager.poll_highest() == 2
    manager.update_priority(9, 7)
    assert manager.poll_highest() == 5
    assert manager.poll_highest() == 9


def test_event_manager_drains_to_minus_one():
    manager = EventManager([[4, 1], [7, 2]])
    assert manager.poll_highest() == 7
    assert manager.poll_highest() == 4
    assert manager.poll_highest() == -1


def test_event_manager_single_event():
    manager = EventManager([[3, 10]])
    assert manager.poll_highest() == 3
    assert manager.poll_highest() == -1


def test_event_manager_lowering_priority():
    manager = EventManager([[1, 9], [2, 5]])
    manager.update_priority(1, 3)
    assert manager.poll_highest() == 2
    assert manager.poll_highest() == 1
    assert manager.poll_highest() == -1


def test_event_manager_repeated_updates_use_latest():
    manager = EventManager([[10, 1], [20, 2], [30, 3]])
    manager.update_priority(10, 100)
    manager.update_priority(10, 2)
    manager.update_priority(30, 2)
    assert manager.poll_highest() == 10
    assert manager.poll_highest() == 20
    assert manager.poll_highest() == 30
    assert manager.poll_highest() == -1


def test_event_manager_update_to_same_priority():
    manager = EventManager([[8, 4], [6, 4]])
    manager.update_priority(8, 4)
    assert manager.poll_highest() == 6
    assert manager.poll_highest() == 8
    assert manager.poll_highest() == -1
