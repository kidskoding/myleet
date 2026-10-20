from solution import FrontMiddleBackQueue


def test_front_middle_back_queue_operations():
    queue = FrontMiddleBackQueue()
    queue.push_front(1)
    queue.push_back(2)
    queue.push_middle(3)
    queue.push_middle(4)

    assert queue.pop_front() == 1
    assert queue.pop_middle() == 3
    assert queue.pop_middle() == 4
    assert queue.pop_back() == 2
    assert queue.pop_front() == -1


def test_front_middle_back_queue_empty_pops():
    queue = FrontMiddleBackQueue()

    assert queue.pop_front() == -1
    assert queue.pop_middle() == -1
    assert queue.pop_back() == -1


def test_front_middle_back_queue_single_element():
    queue = FrontMiddleBackQueue()
    queue.push_back(1)

    assert queue.pop_middle() == 1
    assert queue.pop_back() == -1
