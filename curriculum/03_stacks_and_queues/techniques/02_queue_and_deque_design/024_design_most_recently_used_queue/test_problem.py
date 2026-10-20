from solution import MRUQueue


def test_mru_queue_moves_fetched_value_to_the_back():
    queue = MRUQueue(8)

    assert queue.fetch(3) == 3
    assert queue.fetch(5) == 6
    assert queue.fetch(2) == 2
    assert queue.fetch(8) == 2


def test_mru_queue_fetch_last_is_a_no_op():
    queue = MRUQueue(3)

    assert queue.fetch(3) == 3
    assert queue.fetch(3) == 3
