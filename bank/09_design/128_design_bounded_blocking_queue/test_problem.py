import threading

from solution import BoundedBlockingQueue


def start(target) -> threading.Thread:
    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    return thread


def test_bounded_blocking_queue_fifo_single_thread():
    queue = BoundedBlockingQueue(2)
    queue.enqueue(1)
    queue.enqueue(2)
    assert queue.size() == 2
    assert queue.dequeue() == 1
    assert queue.dequeue() == 2
    assert queue.size() == 0


def test_bounded_blocking_queue_dequeue_waits_for_item():
    queue = BoundedBlockingQueue(1)
    got: list[int] = []
    consumer = start(lambda: got.append(queue.dequeue()))
    consumer.join(0.1)
    assert consumer.is_alive()
    queue.enqueue(7)
    consumer.join(2)
    assert not consumer.is_alive()
    assert got == [7]


def test_bounded_blocking_queue_enqueue_waits_when_full():
    queue = BoundedBlockingQueue(1)
    queue.enqueue(1)
    producer = start(lambda: queue.enqueue(2))
    producer.join(0.1)
    assert producer.is_alive()
    assert queue.size() == 1
    assert queue.dequeue() == 1
    producer.join(2)
    assert not producer.is_alive()
    assert queue.dequeue() == 2


def test_bounded_blocking_queue_many_producers_and_consumers():
    queue = BoundedBlockingQueue(3)
    got: list[int] = []
    lock = threading.Lock()

    def produce(base: int) -> None:
        for i in range(50):
            queue.enqueue(base + i)

    def consume() -> None:
        for _ in range(75):
            value = queue.dequeue()
            with lock:
                got.append(value)

    threads = [start(lambda b=b: produce(b)) for b in (0, 100, 200)]
    threads += [start(consume) for _ in range(2)]
    for thread in threads:
        thread.join(5)
    assert not any(thread.is_alive() for thread in threads)
    assert sorted(got) == [b + i for b in (0, 100, 200) for i in range(50)]
    assert queue.size() == 0
