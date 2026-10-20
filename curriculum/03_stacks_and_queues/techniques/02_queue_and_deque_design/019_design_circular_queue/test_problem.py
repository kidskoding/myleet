from solution import MyCircularQueue


def test_my_circular_queue_fills_and_wraps():
    queue = MyCircularQueue(3)

    assert queue.en_queue(1) is True
    assert queue.en_queue(2) is True
    assert queue.en_queue(3) is True
    assert queue.en_queue(4) is False
    assert queue.rear() == 3
    assert queue.is_full() is True
    assert queue.de_queue() is True
    assert queue.en_queue(4) is True
    assert queue.rear() == 4


def test_my_circular_queue_empty_reads():
    queue = MyCircularQueue(2)

    assert queue.is_empty() is True
    assert queue.front() == -1
    assert queue.rear() == -1
    assert queue.de_queue() is False
