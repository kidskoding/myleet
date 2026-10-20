from solution import MyCircularDeque


def test_my_circular_deque_insert_and_get_front_rear():
    deque_ = MyCircularDeque(3)
    assert deque_.insert_last(1) is True
    assert deque_.insert_last(2) is True
    assert deque_.insert_front(3) is True
    assert deque_.insert_front(4) is False
    assert deque_.get_rear() == 2
    assert deque_.get_front() == 3


def test_my_circular_deque_single_capacity():
    deque_ = MyCircularDeque(1)
    assert deque_.insert_front(1) is True
    assert deque_.is_full() is True
    assert deque_.get_front() == 1
    assert deque_.get_rear() == 1
    assert deque_.delete_front() is True
    assert deque_.is_empty() is True


def test_my_circular_deque_empty_deletes_fail():
    deque_ = MyCircularDeque(2)
    assert deque_.is_empty() is True
    assert deque_.delete_front() is False
    assert deque_.delete_last() is False


def test_my_circular_deque_full_after_wraparound():
    deque_ = MyCircularDeque(2)
    assert deque_.insert_last(1) is True
    assert deque_.insert_last(2) is True
    assert deque_.is_full() is True
    assert deque_.delete_front() is True
    assert deque_.insert_last(3) is True
    assert deque_.get_front() == 2
    assert deque_.get_rear() == 3
