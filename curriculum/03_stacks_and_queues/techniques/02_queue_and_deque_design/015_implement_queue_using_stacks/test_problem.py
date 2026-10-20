from solution import MyQueue


def test_my_queue_fifo_order():
    queue = MyQueue()
    queue.push(1)
    queue.push(2)
    assert queue.peek() == 1
    assert queue.pop() == 1
    assert queue.empty() is False


def test_my_queue_single_element():
    queue = MyQueue()
    queue.push(5)
    assert queue.peek() == 5
    assert queue.pop() == 5
    assert queue.empty() is True


def test_my_queue_empty_after_construction():
    queue = MyQueue()
    assert queue.empty() is True


def test_my_queue_multiple_push_pop_cycles():
    queue = MyQueue()
    queue.push(1)
    queue.push(2)
    queue.push(3)
    assert queue.pop() == 1
    queue.push(4)
    assert queue.pop() == 2
    assert queue.pop() == 3
    assert queue.pop() == 4
    assert queue.empty() is True
